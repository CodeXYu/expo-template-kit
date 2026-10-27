#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');
const templateRoot = join(root, 'template');
const forbiddenDirectories = ['app', 'pages', 'template'];
const requiredTemplateFiles = [
  'env.template',
  'eslint.config.js',
  '.prettierrc.json',
  'metro.config.js',
  'src/app/_layout.tsx',
  'src/app/+not-found.tsx',
  'src/components/app-error-view/index.tsx',
  'src/components/app-startup-error-view/index.tsx',
  'src/app/index.tsx',
  'src/components/.gitkeep',
  'src/config/environment.ts',
  'src/config/query-client.ts',
  'src/config/reactotron.ts',
  'src/config/reactotron.native.ts',
  'src/config/reactotron.web.ts',
  'src/config/sentry.ts',
  'src/constants/storage.ts',
  'src/hooks/.gitkeep',
  'src/i18n/index.ts',
  'src/i18n/locales/en.ts',
  'src/i18n/locales/zh-CN.ts',
  'src/lib/initialize-app.ts',
  'src/pages/home/index.tsx',
  'src/pages/home/index.api.ts',
  'src/pages/home/index.logic.ts',
  'src/pages/home/index.type.ts',
  'src/providers/app-providers.tsx',
  'src/providers/app-theme-provider.tsx',
  'src/providers/development-backstage.tsx',
  'src/services/api.ts',
  'src/stores/use-preferences-store.ts',
  'src/utils/.gitkeep',
];
const forbiddenTemplateFiles = [
  'src/hooks/use-app-ready.ts',
  'src/providers/overlay-provider.tsx',
  'src/providers/query-provider.tsx',
  'src/utils/logger.ts',
  'src/utils/request.ts',
];
const violations = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }
    const content = readFileSync(entryPath, 'utf8');
    if (/['\"]@\//.test(content)) {
      violations.push(`${entryPath}: package source must not use the consumer @/ alias.`);
    }
    if (/process\.env\.EXPO_PUBLIC_/.test(content)) {
      violations.push(`${entryPath}: package source cannot read project EXPO_PUBLIC_* variables.`);
    }
  }
}

for (const directory of forbiddenDirectories) {
  if (existsSync(join(sourceRoot, directory))) {
    violations.push(
      `src/${directory} must be generated into business projects, not stored in the package.`
    );
  }
}

for (const file of requiredTemplateFiles) {
  if (!existsSync(join(templateRoot, file))) {
    violations.push(`template/${file} is required by generated projects.`);
  }
}

for (const file of forbiddenTemplateFiles) {
  if (existsSync(join(templateRoot, file))) {
    violations.push(`template/${file} duplicates an implementation owned by the package.`);
  }
}

walk(sourceRoot);

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
}
