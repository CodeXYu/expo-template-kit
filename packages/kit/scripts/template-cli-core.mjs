import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { patchNativeDependencies } from './patch-native-deps.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageMeta = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const templatePackageName = packageMeta.name;
const templateGitUrl = 'git+ssh://git@github.com/CodeXYu/expo-template-kit.git';
export const supportedExpoSdks = packageMeta.template.supportedExpoSdks;
const projectTemplateRoot = join(packageRoot, 'template');

export const expoPackages = [
  '@expo/vector-icons',
  '@react-native-async-storage/async-storage',
  // Expo resolves these native modules against the selected SDK instead of
  // taking npm latest, keeping Expo Go and native builds on tested versions.
  '@sentry/react-native',
  '@shopify/flash-list',
  'expo-image',
  'expo-localization',
  'expo-network',
  'react-native-gesture-handler',
  // Expo resolves this native module to the version compatible with the selected SDK.
  'react-native-keyboard-controller',
  'react-native-reanimated',
  'react-native-safe-area-context',
];

export const npmPackages = [
  '@tanstack/react-query',
  'dayjs',
  'i18next',
  'react-i18next',
  'react-native-splash-screen-newarch@2.2.0',
  'reactotron-react-native@5.3.1',
  'rn-backstage@1.5.4',
  'zustand',
];

export const devNpmPackages = ['dotenv-cli@11.0.0'];

function fail(message) {
  throw new Error(message);
}

function run(command, args, cwd) {
  const childEnv = { ...process.env };
  delete childEnv.npm_config_package;

  const result = spawnSync(command, args, {
    cwd,
    env: childEnv,
    stdio: 'inherit',
  });

  if (result.error) {
    fail(`Unable to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function isValidAppId(appId) {
  return /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(appId);
}

export function parseCreateArgs(args) {
  const [projectName, ...options] = args;

  if (!projectName || projectName.startsWith('-')) {
    fail('Project name is required.');
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(projectName)) {
    fail('Project name may only contain letters, numbers, dots, underscores, and hyphens.');
  }

  let appId;
  let sdk = Math.max(...supportedExpoSdks);

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (option === '--app-id') {
      appId = options[index + 1];
      index += 1;
      continue;
    }

    if (option === '--sdk') {
      sdk = Number(options[index + 1]);
      index += 1;
      continue;
    }

    fail(`Unknown create option: ${option}`);
  }

  if (!appId || !isValidAppId(appId)) {
    fail('--app-id must be a reverse-domain identifier, such as com.company.myapp.');
  }

  if (!supportedExpoSdks.includes(sdk)) {
    fail(
      `SDK ${sdk} is not supported by this template. Supported SDKs: ${supportedExpoSdks.join(', ')}.`
    );
  }

  return { projectName, appId, sdk };
}

export function configureExpoApp(config, appId) {
  const expo = config.expo ?? config;
  const plugins = Array.isArray(expo.plugins) ? expo.plugins : [];
  const splashPluginName = 'react-native-splash-screen-newarch';
  const sentryPluginName = '@sentry/react-native';
  const pluginConfig = [
    splashPluginName,
    {
      backgroundColor: '#ffffff',
      image: './assets/images/splash.png',
    },
  ];
  // Organization, project, and auth token are resolved from SENTRY_* build
  // environment variables so this file never contains a secret.
  const sentryPluginConfig = [sentryPluginName, { url: 'https://sentry.io/' }];

  expo.ios = { ...(expo.ios ?? {}), bundleIdentifier: appId };
  expo.android = { ...(expo.android ?? {}), package: appId };
  expo.plugins = [
    ...plugins.filter(plugin => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return (
        name !== splashPluginName &&
        name !== 'expo-splash-screen' &&
        name !== sentryPluginName &&
        name !== '@sentry/react-native/expo'
      );
    }),
    pluginConfig,
    sentryPluginConfig,
  ];

  return config.expo ? { ...config, expo } : expo;
}

function readProjectPackage(projectRoot) {
  const packagePath = join(projectRoot, 'package.json');
  if (!existsSync(packagePath)) {
    fail(`No package.json found in ${projectRoot}.`);
  }

  return {
    packagePath,
    packageJson: JSON.parse(readFileSync(packagePath, 'utf8')),
  };
}

export function ensureEmptyTarget(targetPath) {
  if (!existsSync(targetPath)) {
    return;
  }

  if (readdirSync(targetPath).length > 0) {
    fail(`Target directory already exists and is not empty: ${targetPath}`);
  }
}

function copyDirectoryContents(sourceRoot, targetRoot) {
  mkdirSync(targetRoot, { recursive: true });

  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const sourcePath = join(sourceRoot, entry.name);
    const targetName =
      sourceRoot === projectTemplateRoot && entry.name.startsWith('env.')
        ? '.' + entry.name
        : entry.name;
    const targetPath = join(targetRoot, targetName);

    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else {
      copyFileSync(sourcePath, targetPath);
    }
  }
}

export function copyProjectTemplate(projectRoot) {
  copyDirectoryContents(projectTemplateRoot, projectRoot);
  copyFileSync(join(packageRoot, 'AGENTS.md'), join(projectRoot, 'AGENTS.md'));

  const splashPath = join(projectRoot, 'assets/images/splash.png');
  mkdirSync(dirname(splashPath), { recursive: true });
  copyFileSync(join(packageRoot, 'assets/images/splash.png'), splashPath);
}

export function updateProjectScripts(projectRoot) {
  const { packageJson, packagePath } = readProjectPackage(projectRoot);
  packageJson.main = 'expo-router/entry';
  const patchCommand = 'node node_modules/expo-template-kit/scripts/patch-native-deps.mjs';
  const previousPostinstall = packageJson.scripts?.postinstall;
  const postinstall = previousPostinstall?.includes(patchCommand)
    ? previousPostinstall
    : [previousPostinstall, patchCommand].filter(Boolean).join(' && ');
  packageJson.scripts = {
    ...packageJson.scripts,
    postinstall,
    start: 'npm run start:dev',
    android: 'npm run android:dev',
    ios: 'npm run ios:dev',
    'start:dev': 'dotenv -o -e .env.development -- expo start',
    'start:int': 'dotenv -o -e .env.int -- expo start',
    'android:dev': 'dotenv -o -e .env.development -- expo run:android',
    'android:int': 'dotenv -o -e .env.int -- expo run:android --variant release',
    'android:production': 'dotenv -o -e .env.production -- expo run:android --variant release',
    'ios:dev': 'dotenv -o -e .env.development -- expo run:ios',
    'ios:int': 'dotenv -o -e .env.int -- expo run:ios --configuration Release',
    'ios:production': 'dotenv -o -e .env.production -- expo run:ios --configuration Release',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    typecheck: packageJson.scripts?.typecheck ?? 'tsc --noEmit',
    'template:doctor': 'rn-expo-template doctor',
    'template:update': 'rn-expo-template update',
    'template:use-local': 'rn-expo-template use-local',
  };
  writeJson(packagePath, packageJson);
}

export function updateProjectTypeScriptAliases(projectRoot) {
  const tsconfigPath = join(projectRoot, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    fail('The generated Expo project does not contain tsconfig.json.');
  }

  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
  tsconfig.compilerOptions = {
    ...tsconfig.compilerOptions,
    paths: {
      ...tsconfig.compilerOptions?.paths,
      '@/*': ['./src/*'],
      '@/assets/*': ['./assets/*'],
    },
  };
  writeJson(tsconfigPath, tsconfig);
}

function configureGeneratedProject(projectRoot, appId) {
  const appConfigPath = join(projectRoot, 'app.json');
  if (!existsSync(appConfigPath)) {
    fail('The generated Expo project does not contain app.json.');
  }

  for (const generatedDirectory of ['app', 'src']) {
    rmSync(join(projectRoot, generatedDirectory), {
      recursive: true,
      force: true,
    });
  }

  const appConfig = JSON.parse(readFileSync(appConfigPath, 'utf8'));
  writeJson(appConfigPath, configureExpoApp(appConfig, appId));
  copyProjectTemplate(projectRoot);
  updateProjectScripts(projectRoot);
  updateProjectTypeScriptAliases(projectRoot);
}

/** Until a version is tagged, new projects use the GitHub main branch. */
export function templateReference(ref = 'main') {
  return templateGitUrl + '#' + ref;
}

/** Git dependencies point at a monorepo; pack only its standalone shared package. */
function resolveTemplateInstallReference(projectRoot, reference) {
  if (!reference.startsWith(templateGitUrl + '#')) return reference;
  const ref = reference.slice(templateGitUrl.length + 1);
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'expo-kit-source-'));
  try {
    const repository = join(temporaryDirectory, 'repository');
    run(
      'git',
      [
        'clone',
        '--depth',
        '1',
        '--single-branch',
        '--no-tags',
        '--branch',
        ref,
        'git@github.com:CodeXYu/expo-template-kit.git',
        repository,
      ],
      temporaryDirectory
    );
    const packageDirectory = join(repository, 'packages/kit');
    run('npm', ['pack', packageDirectory, '--pack-destination', temporaryDirectory], projectRoot);
    const tarball = readdirSync(temporaryDirectory).find(file => file.endsWith('.tgz'));
    if (!tarball) fail('npm pack did not produce a template tarball.');
    // Keep the artifact inside the consumer project so npm ci works after cloning it.
    const vendorDirectory = join(projectRoot, 'vendor');
    mkdirSync(vendorDirectory, { recursive: true });
    const artifactName = tarball.replace(
      /\.tgz$/,
      '-' + ref.replace(/[^a-zA-Z0-9.-]/g, '-') + '.tgz'
    );
    copyFileSync(join(temporaryDirectory, tarball), join(vendorDirectory, artifactName));
    return join(vendorDirectory, artifactName);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function installTemplate(projectRoot, reference) {
  const installReference = resolveTemplateInstallReference(projectRoot, reference);
  run('npm', ['install', ...npmPackages, installReference], projectRoot);
  run('npm', ['install', '--save-dev', ...devNpmPackages], projectRoot);
  run('npx', ['expo', 'install', ...expoPackages], projectRoot);
  run('npx', ['expo', 'install', '--dev', 'eslint', 'eslint-config-expo'], projectRoot);
  run('npm', ['install', '--save-dev', 'prettier'], projectRoot);
}

export function createProject({ projectName, appId, sdk }, cwd = process.cwd()) {
  const projectRoot = resolve(cwd, projectName);
  ensureEmptyTarget(projectRoot);
  run(
    'npx',
    ['create-expo-app@latest', projectName, '--template', `default@sdk-${sdk}`, '--yes'],
    cwd
  );
  configureGeneratedProject(projectRoot, appId);
  installTemplate(projectRoot, process.env.RN_EXPO_TEMPLATE_REFERENCE ?? templateReference());
}

function getExpoSdk(packageJson) {
  const expoVersion = packageJson.dependencies?.expo ?? packageJson.devDependencies?.expo;
  const match = typeof expoVersion === 'string' ? expoVersion.match(/(\d+)/) : null;
  return match ? Number(match[1]) : null;
}

export function updateProject(version, projectRoot = process.cwd()) {
  if (!/^v?\d+\.\d+(?:\.\d+)?(?:[-+][A-Za-z0-9.-]+)?$/.test(version ?? '')) {
    fail('Update target must be an exact tag such as 1.0 or 1.1.0.');
  }

  const { packageJson, packagePath } = readProjectPackage(projectRoot);
  if (!packageJson.dependencies?.[templatePackageName]) {
    fail(`${templatePackageName} is not installed in this project.`);
  }

  const reference = resolveTemplateInstallReference(projectRoot, templateReference(version));
  packageJson.dependencies[templatePackageName] = reference.startsWith(templateGitUrl)
    ? reference
    : 'file:' + relative(projectRoot, reference);
  writeJson(packagePath, packageJson);
  run('npm', ['install'], projectRoot);
  patchNativeDependencies(projectRoot);
  run('npx', ['expo', 'install', '--fix'], projectRoot);
  run('npx', ['expo-doctor'], projectRoot);
}

export function doctor(projectRoot = process.cwd()) {
  const { packageJson } = readProjectPackage(projectRoot);
  const sdk = getExpoSdk(packageJson);

  if (!sdk || !supportedExpoSdks.includes(sdk)) {
    fail(
      `This template supports Expo SDK ${supportedExpoSdks.join(' and ')}; found ${sdk ?? 'an unknown version'}.`
    );
  }

  run('npx', ['expo-doctor'], projectRoot);
}

export function installLocalTemplate(sourcePath, projectRoot = process.cwd()) {
  if (!sourcePath) {
    fail('A local template repository path is required.');
  }

  const sourceRoot = resolve(projectRoot, sourcePath);
  const templatePath = existsSync(join(sourceRoot, 'packages/kit/package.json'))
    ? join(sourceRoot, 'packages/kit')
    : sourceRoot;
  if (!existsSync(join(templatePath, 'package.json'))) {
    fail(`No template package.json found in ${templatePath}.`);
  }

  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rn-expo-template-'));
  try {
    run('npm', ['pack', templatePath, '--pack-destination', temporaryDirectory], projectRoot);
    const tarball = readdirSync(temporaryDirectory).find(file => file.endsWith('.tgz'));
    if (!tarball) {
      fail('npm pack did not produce a tarball.');
    }
    run(
      'npm',
      ['install', '--no-save', '--package-lock=false', join(temporaryDirectory, tarball)],
      projectRoot
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
