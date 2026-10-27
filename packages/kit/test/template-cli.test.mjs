import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

import {
  configureExpoApp,
  copyProjectTemplate,
  devNpmPackages,
  ensureEmptyTarget,
  expoPackages,
  isValidAppId,
  npmPackages,
  parseCreateArgs,
  supportedExpoSdks,
  templateReference,
  updateProjectScripts,
  updateProjectTypeScriptAliases,
} from '../scripts/template-cli-core.mjs';

const templatePackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const templatePackageName = templatePackage.name;

function collectKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? collectKeys(child, path) : [path];
  });
}

function readTypeScriptModule(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const context = { exports: module.exports, module };
  vm.runInNewContext(output, context, { filename: filePath });
  return module.exports;
}

test('runs through an npm-style bin symlink', () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'template-cli-bin-'));
  const binPath = join(temporaryDirectory, 'create-rn-expo-app');

  try {
    symlinkSync(join(process.cwd(), 'scripts/template-cli.mjs'), binPath);
    const result = spawnSync(process.execPath, [binPath, '--help'], {
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Create: create-rn-expo-app/);
    assert.match(result.stdout, new RegExp(`\\[--sdk ${supportedExpoSdks.join('\\|')}\\]`));
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test('accepts reverse-domain identifiers valid for both native platforms', () => {
  assert.equal(isValidAppId('com.company.myapp'), true);
  assert.equal(isValidAppId('com.company.my-app'), false);
  assert.equal(isValidAppId('myapp'), false);
});

test('declares Expo SDK 58 compatibility for generated projects', () => {
  assert.equal(supportedExpoSdks.includes(58), true);
  assert.equal(Math.max(...supportedExpoSdks), 58);
  assert.match(templatePackage.peerDependencies.expo, /<59$/);
  assert.match(templatePackage.peerDependencies['expo-router'], /<59$/);
  assert.match(templatePackage.peerDependencies['expo-image'], /<59$/);
  assert.match(templatePackage.peerDependencies['expo-network'], /<59$/);
  assert.match(templatePackage.peerDependencies['react-native'], /<0\.89$/);
  assert.match(templatePackage.peerDependencies['react-native-gesture-handler'], /<4$/);
});

test('requires an app identifier and a supported SDK', () => {
  assert.deepEqual(parseCreateArgs(['my-app', '--app-id', 'com.company.myapp']), {
    projectName: 'my-app',
    appId: 'com.company.myapp',
    sdk: 58,
  });
  assert.throws(() => parseCreateArgs(['my-app', '--app-id', 'com.company.myapp', '--sdk', '54']));
  assert.throws(() => parseCreateArgs(['my-app', '--app-id', 'invalid']));
  assert.throws(() => parseCreateArgs(['my-app', '--app-id', 'com.company.myapp', '--sdk', '53']));
});

test('updates app identifiers and owning plugins without duplicates', () => {
  const nextConfig = configureExpoApp(
    {
      expo: {
        name: 'my-app',
        plugins: [
          'expo-router',
          ['expo-splash-screen', { image: 'default.png' }],
          ['react-native-splash-screen-newarch', { image: 'old.png' }],
          ['@sentry/react-native/expo', { organization: 'old-org' }],
        ],
      },
    },
    'com.company.myapp'
  );

  assert.equal(nextConfig.expo.ios.bundleIdentifier, 'com.company.myapp');
  assert.equal(nextConfig.expo.android.package, 'com.company.myapp');
  assert.deepEqual(nextConfig.expo.plugins, [
    'expo-router',
    [
      'react-native-splash-screen-newarch',
      {
        backgroundColor: '#ffffff',
        image: './assets/images/splash.png',
      },
    ],
    ['@sentry/react-native', { url: 'https://sentry.io/' }],
  ]);
});

test('rejects a non-empty target directory before creating a project', () => {
  const directory = mkdtempSync(join(tmpdir(), 'rn-expo-template-test-'));
  try {
    writeFileSync(join(directory, 'existing.txt'), 'keep');
    assert.throws(() => ensureEmptyTarget(directory), /not empty/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('writes project-owned architecture foundations and development diagnostics', () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'rn-expo-template-generated-'));

  try {
    copyProjectTemplate(projectRoot);

    const providers = readFileSync(join(projectRoot, 'src/providers/app-providers.tsx'), 'utf8');
    const backstage = readFileSync(
      join(projectRoot, 'src/providers/development-backstage.tsx'),
      'utf8'
    );
    const reactotron = readFileSync(join(projectRoot, 'src/config/reactotron.native.ts'), 'utf8');
    const environment = readFileSync(join(projectRoot, 'src/config/environment.ts'), 'utf8');
    const sentryConfig = readFileSync(join(projectRoot, 'src/config/sentry.ts'), 'utf8');
    const metroConfig = readFileSync(join(projectRoot, 'metro.config.js'), 'utf8');
    const themeConfig = readFileSync(join(projectRoot, 'src/config/theme.ts'), 'utf8');
    const appThemeProvider = readFileSync(
      join(projectRoot, 'src/providers/app-theme-provider.tsx'),
      'utf8'
    );
    const rootLayout = readFileSync(join(projectRoot, 'src/app/_layout.tsx'), 'utf8');
    const startupErrorView = readFileSync(
      join(projectRoot, 'src/components/app-startup-error-view/index.tsx'),
      'utf8'
    );
    const appErrorView = readFileSync(
      join(projectRoot, 'src/components/app-error-view/index.tsx'),
      'utf8'
    );
    const notFoundRoute = readFileSync(join(projectRoot, 'src/app/+not-found.tsx'), 'utf8');
    const homePage = readFileSync(join(projectRoot, 'src/pages/home/index.tsx'), 'utf8');

    assert.match(providers, /DevelopmentBackstage/);
    assert.match(providers, /QueryClientProvider/);
    assert.match(providers, /KeyboardProvider/);
    assert.match(providers, /AppLifecycleProvider/);
    assert.match(providers, /NetworkStatusProvider/);
    assert.doesNotMatch(providers, /\bQueryProvider\b/);
    assert.match(backstage, /isBackstageEnabled/);
    assert.doesNotMatch(backstage, /process\.env/);
    assert.match(backstage, /storageAdapter/);
    assert.match(backstage, /\.\.\/stores\/use-preferences-store/);
    assert.match(reactotron, /reactotron-react-native/);
    assert.match(reactotron, /isDev \|\| \(isInt && Boolean\(reactotronHost\)\)/);
    assert.match(reactotron, /host: reactotronHost/);
    assert.match(reactotron, /from '@\/config\/environment'/);
    assert.match(reactotron, /function bridgeConsoleToReactotron/);
    assert.match(reactotron, /log: false/);
    assert.match(reactotron, /client\.warn\(content\)/);
    assert.match(reactotron, /client\.error\(content, error\?\.stack\)/);
    assert.match(reactotron, /client\.debug\(content\)/);
    assert.match(environment, /export const isDev/);
    assert.match(environment, /export const isInt/);
    assert.match(environment, /export const isProd/);
    assert.match(environment, /EXPO_PUBLIC_REACTOTRON_HOST/);
    assert.match(environment, /EXPO_PUBLIC_SENTRY_DSN/);
    assert.match(environment, /sentryTracesSampleRate/);
    assert.match(sentryConfig, /Sentry\.init/);
    assert.match(sentryConfig, /initErrorReporting\(sentryReporter\)/);
    assert.match(sentryConfig, /navigationIntegration\?\.registerNavigationContainer/);
    assert.match(metroConfig, /getSentryExpoConfig/);
    assert.match(themeConfig, /satisfies ThemeConfig/);
    assert.match(themeConfig, /interface AppThemeColorTokens/);
    assert.match(appThemeProvider, /theme=\{theme\}/);
    assert.match(rootLayout, /logger\.setConfig\(\{ enabled: isLoggerEnabled \}\)/);
    assert.match(rootLayout, /useNavigationContainerRef/);
    assert.match(rootLayout, /registerSentryNavigation/);
    assert.match(rootLayout, /Sentry\.wrap\(RootLayout\)/);
    assert.match(rootLayout, /layer: 'app-startup'/);
    assert.match(rootLayout, /layer: 'route'/);
    assert.match(rootLayout, /AppStartupErrorView/);
    assert.match(rootLayout, /onRetry=\{\(\) => void retry\(\)\}/);
    assert.match(rootLayout, /export function ErrorBoundary/);
    assert.match(startupErrorView, /loading: isRetrying/);
    assert.match(appErrorView, /Shared full-screen recovery UI/);
    assert.match(notFoundRoute, /router\.replace\('\/'\)/);
    assert.match(homePage, /useHomePageLogic/);
    assert.match(homePage, /<BasePage/);
    assert.match(homePage, /title=\{title\}/);
    assert.match(homePage, /scrollEnabled=\{false\}/);
    assert.doesNotMatch(homePage, /isNetworkStatusEnabled/);
    assert.doesNotMatch(homePage, /onNetworkStateChange/);
    assert.match(readFileSync(join(process.cwd(), '.gitignore'), 'utf8'), /\.env\*/);
    assert.match(readFileSync(join(process.cwd(), '.gitignore'), 'utf8'), /!\.env\.template/);
    assert.match(
      readFileSync(join(projectRoot, '.prettierrc.json'), 'utf8'),
      /"trailingComma": "es5"/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.template'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_BACKSTAGE=false/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.template'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_LOGGER=false/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.template'), 'utf8'),
      /EXPO_PUBLIC_SENTRY_DSN=/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.template'), 'utf8'),
      /EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.development'), 'utf8'),
      /EXPO_PUBLIC_APP_ENV=development/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.development'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_LOGGER=true/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.development'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_BACKSTAGE=true/
    );
    assert.match(readFileSync(join(projectRoot, '.env.int'), 'utf8'), /EXPO_PUBLIC_APP_ENV=int/);
    assert.match(
      readFileSync(join(projectRoot, '.env.int'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_LOGGER=false/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.production'), 'utf8'),
      /EXPO_PUBLIC_APP_ENV=production/
    );
    assert.match(
      readFileSync(join(projectRoot, '.env.production'), 'utf8'),
      /EXPO_PUBLIC_ENABLE_LOGGER=false/
    );
    for (const profile of ['development', 'int', 'production']) {
      assert.match(
        readFileSync(join(projectRoot, `.env.${profile}`), 'utf8'),
        /EXPO_PUBLIC_REACTOTRON_HOST=/
      );
    }
    assert.equal(
      readFileSync(join(projectRoot, 'AGENTS.md'), 'utf8'),
      readFileSync(join(process.cwd(), 'AGENTS.md'), 'utf8')
    );

    for (const relativePath of [
      'src/app/+not-found.tsx',
      'src/components/app-error-view/index.tsx',
      'src/components/app-startup-error-view/index.tsx',
      'src/components/.gitkeep',
      'metro.config.js',
      'src/config/environment.ts',
      'src/config/sentry.ts',
      'src/config/theme.ts',
      'src/config/reactotron.ts',
      'src/config/reactotron.native.ts',
      'src/config/reactotron.web.ts',
      'src/hooks/.gitkeep',
      'src/utils/.gitkeep',
      'src/services/api.ts',
      'src/i18n/index.ts',
      'src/i18n/locales/en.ts',
      'src/i18n/locales/zh-CN.ts',
      'src/pages/home/index.api.ts',
      'src/pages/home/index.logic.ts',
      'src/pages/home/index.type.ts',
    ]) {
      assert.equal(existsSync(join(projectRoot, relativePath)), true, relativePath);
    }

    const apiSource = readFileSync(join(projectRoot, 'src/services/api.ts'), 'utf8');
    assert.match(apiSource, /createRequestClient/);
    assert.match(apiSource, /@\/config\/environment/);
    assert.match(apiSource, /baseURL:\s*apiBaseURL/);
    assert.match(apiSource, /timeoutMs:\s*30_000/);
    assert.match(apiSource, /successCode:\s*'10000'/);

    for (const relativePath of [
      'src/hooks/use-app-ready.ts',
      'src/providers/overlay-provider.tsx',
      'src/providers/query-provider.tsx',
      'src/utils/logger.ts',
      'src/utils/request.ts',
    ]) {
      assert.equal(existsSync(join(projectRoot, relativePath)), false, relativePath);
    }
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('installs Reactotron and writes local environment scripts and aliases', () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'rn-expo-template-scripts-'));

  try {
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify({
        main: './src/index.ts',
        scripts: { custom: 'node custom.mjs', postinstall: 'node setup.mjs' },
      })
    );
    writeFileSync(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { paths: { 'existing/*': ['./existing/*'] } },
      })
    );

    updateProjectScripts(projectRoot);
    updateProjectScripts(projectRoot); // Re-running configuration must preserve existing hooks.
    updateProjectTypeScriptAliases(projectRoot);

    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    assert.equal(packageJson.scripts.custom, 'node custom.mjs');
    assert.equal(packageJson.main, 'expo-router/entry');
    assert.equal(
      packageJson.scripts.postinstall,
      'node setup.mjs && node node_modules/expo-template-kit/scripts/patch-native-deps.mjs'
    );
    assert.equal(packageJson.scripts.start, 'npm run start:dev');
    assert.equal(packageJson.scripts.format, 'prettier --write .');
    assert.equal(packageJson.scripts['format:check'], 'prettier --check .');
    assert.equal(
      packageJson.scripts['android:int'],
      'dotenv -o -e .env.int -- expo run:android --variant release'
    );
    assert.equal(
      packageJson.scripts['ios:production'],
      'dotenv -o -e .env.production -- expo run:ios --configuration Release'
    );
    assert.equal(npmPackages.includes('reactotron-react-native@5.3.1'), true);
    assert.deepEqual(devNpmPackages, ['dotenv-cli@11.0.0']);
    assert.equal(npmPackages.includes('react-native-keyboard-controller@1.22.5'), false);
    assert.equal(expoPackages.includes('react-native-keyboard-controller'), true);
    assert.equal(expoPackages.includes('@shopify/flash-list'), true);
    assert.equal(expoPackages.includes('@sentry/react-native'), true);

    const tsconfig = JSON.parse(readFileSync(join(projectRoot, 'tsconfig.json'), 'utf8'));
    assert.deepEqual(tsconfig.compilerOptions.paths, {
      'existing/*': ['./existing/*'],
      '@/*': ['./src/*'],
      '@/assets/*': ['./assets/*'],
    });
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('keeps generated locale keys aligned with the shared UI requirements', () => {
  const { en } = readTypeScriptModule(join(process.cwd(), 'template/src/i18n/locales/en.ts'));
  const { zhCN } = readTypeScriptModule(join(process.cwd(), 'template/src/i18n/locales/zh-CN.ts'));
  const enKeys = collectKeys(en).sort();
  const zhKeys = collectKeys(zhCN).sort();

  assert.deepEqual(enKeys, zhKeys);
  for (const key of [
    'common.clearInput',
    'common.error_message',
    'common.error_title',
    'common.loading',
    'common.loading_more',
    'common.network_error',
    'common.no_data',
    'common.no_more',
    'common.retry',
    'common.retry_load',
    'errors.network',
    'errors.timeout',
    'errors.cancelled',
    'errors.unauthorized',
    'errors.forbidden',
    'errors.not_found',
    'errors.rate_limited',
    'errors.server',
    'errors.request',
    'errors.business',
    'errors.unknown',
  ]) {
    assert.equal(enKeys.includes(key), true, key);
  }
});

test('publishes only the intentional root API groups', () => {
  const rootExports = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');
  const utilityExports = readFileSync(join(process.cwd(), 'src/utils/index.ts'), 'utf8');
  const pageKitExports = readFileSync(
    join(process.cwd(), 'src/components/page-kit/index.ts'),
    'utf8'
  );
  const errorReporting = readFileSync(
    join(process.cwd(), 'src/services/monitoring/error-reporting.ts'),
    'utf8'
  );

  assert.match(rootExports, /export \* from '\.\/utils';/);
  assert.match(rootExports, /type ThemeOverrides/);
  assert.match(rootExports, /type ColorTokens/);
  assert.match(rootExports, /useThemeName/);
  assert.match(rootExports, /type ErrorReporter/);
  assert.match(pageKitExports, /PageList/);
  assert.match(pageKitExports, /type PageListProps/);
  assert.match(errorReporting, /export interface ErrorReporter/);
  assert.match(
    errorReporting,
    /export function initErrorReporting\(nextReporter\?: ErrorReporter\)/
  );

  for (const requiredExport of [
    './components/page-kit',
    './components/ui-kit',
    './hooks/use-app-ready',
    './providers/app-lifecycle-provider',
    './providers/network-status-provider',
    './hooks/use-theme',
    './lib/query-client',
    './providers/overlay-provider',
    './providers/theme-provider',
    './services/monitoring/error-reporting',
    './utils/error',
    './utils/request',
    './utils/logger',
  ]) {
    assert.match(rootExports, new RegExp(requiredExport.replaceAll('/', '\\/')));
  }

  for (const removedExport of [
    'usePagination',
    'usePermission',
    'useRequestError',
    'QueryProvider',
    'usePreferencesStore',
    'from "./i18n"',
  ]) {
    assert.doesNotMatch(rootExports, new RegExp(removedExport));
  }

  for (const projectEnvironmentExport of ['isDev', 'isInt', 'isProd']) {
    assert.doesNotMatch(utilityExports, new RegExp(`export const ${projectEnvironmentExport}`));
  }
});

test('updates only the exact template dependency and leaves business sources intact', () => {
  const projectRoot = mkdtempSync(join(tmpdir(), 'rn-expo-template-update-'));
  const commandDirectory = join(projectRoot, '.test-bin');
  const appPath = join(projectRoot, 'src/app/index.tsx');
  const pagePath = join(projectRoot, 'src/pages/home/index.tsx');
  const configPath = join(projectRoot, 'src/config/query-client.ts');
  const localePath = join(projectRoot, 'src/i18n/locales/en.ts');
  const componentPath = join(projectRoot, 'src/components/business-card.tsx');

  try {
    mkdirSync(join(projectRoot, 'src/app'), { recursive: true });
    mkdirSync(join(projectRoot, 'src/pages/home'), { recursive: true });
    mkdirSync(join(projectRoot, 'src/config'), { recursive: true });
    mkdirSync(join(projectRoot, 'src/i18n/locales'), { recursive: true });
    mkdirSync(join(projectRoot, 'src/components'), { recursive: true });
    mkdirSync(commandDirectory);
    writeFileSync(
      join(projectRoot, 'package.json'),
      JSON.stringify({
        dependencies: { [templatePackageName]: 'git+ssh://old-tag' },
      })
    );
    writeFileSync(appPath, 'export default null;\n');
    writeFileSync(pagePath, 'export default null;\n');
    writeFileSync(configPath, 'export const queryClient = null;\n');
    writeFileSync(localePath, "export const en = { custom: 'keep' };\n");
    writeFileSync(componentPath, 'export const BusinessCard = null;\n');

    for (const command of ['npm', 'npx', 'git']) {
      const commandPath = join(commandDirectory, command);
      const stub =
        command === 'git'
          ? '#!/bin/sh\nexit 0\n'
          : '#!/bin/sh\n[ -z "$npm_config_package" ] || exit 1\nif [ "$1" = pack ]; then /usr/bin/touch "$4/expo-template-kit-1.0.0.tgz"; fi\n';
      writeFileSync(commandPath, stub);
      chmodSync(commandPath, 0o755);
    }

    const result = spawnSync(
      process.execPath,
      [join(process.cwd(), 'scripts/template-cli.mjs'), 'update', 'v1.1.0'],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          PATH: commandDirectory,
          npm_config_package: 'git+ssh://outer-package',
        },
      }
    );

    assert.equal(result.status, 0, result.stderr.toString());
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
    assert.equal(
      packageJson.dependencies[templatePackageName],
      'file:vendor/expo-template-kit-1.0.0-v1.1.0.tgz'
    );
    assert.equal(existsSync(join(projectRoot, 'vendor/expo-template-kit-1.0.0-v1.1.0.tgz')), true);
    assert.equal(readFileSync(appPath, 'utf8'), 'export default null;\n');
    assert.equal(readFileSync(pagePath, 'utf8'), 'export default null;\n');
    assert.equal(readFileSync(configPath, 'utf8'), 'export const queryClient = null;\n');
    assert.equal(readFileSync(localePath, 'utf8'), "export const en = { custom: 'keep' };\n");
    assert.equal(readFileSync(componentPath, 'utf8'), 'export const BusinessCard = null;\n');
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('uses GitHub main before a release and preserves exact explicit tags', () => {
  assert.equal(templateReference(), 'git+ssh://git@github.com/CodeXYu/expo-template-kit.git#main');
  assert.equal(
    templateReference('1.0'),
    'git+ssh://git@github.com/CodeXYu/expo-template-kit.git#1.0'
  );
});
