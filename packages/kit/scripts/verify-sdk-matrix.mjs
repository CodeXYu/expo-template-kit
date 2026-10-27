#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requestedSdks = process.argv.slice(2).map(Number).filter(Boolean);
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sdks = requestedSdks.length > 0 ? requestedSdks : packageJson.template.supportedExpoSdks;

const templatePackageName = packageJson.name;

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed.`);
  }
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(entryPath);
    }
    return entry.name.endsWith('.js') ? [entryPath] : [];
  });
}

function verifyGeneratedOutput(projectRoot, expectedTemplateTarball) {
  const packagePath = join(projectRoot, 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error(`Generated project is missing package.json: ${projectRoot}`);
  }

  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const dependencyEntries = Object.entries({
    dependencies: packageJson.dependencies,
    devDependencies: packageJson.devDependencies,
  }).flatMap(([, dependencies]) => Object.entries(dependencies ?? {}));
  for (const [name, version] of dependencyEntries) {
    if (typeof version !== 'string' || !version.startsWith('file:')) {
      continue;
    }

    const referencedPath = resolve(projectRoot, version.slice('file:'.length));
    if (name !== templatePackageName || referencedPath !== resolve(expectedTemplateTarball)) {
      throw new Error(
        `Generated project contains an unexpected local dependency: ${name}@${version}`
      );
    }
  }

  const distRoot = join(projectRoot, 'dist');
  if (!existsSync(distRoot)) {
    throw new Error(`Generated project is missing its Web export: ${projectRoot}`);
  }

  // SDK 58 can emit a server bundle that reads EXPO_PUBLIC_* at runtime by
  // design. Only client bundles must have those values statically inlined.
  // The output layout differs between static and server exports, so filter by
  // the server directory instead of assuming one fixed client path.
  const clientJavaScriptFiles = collectJavaScriptFiles(distRoot).filter(filePath => {
    return !filePath.split(sep).includes('server');
  });
  if (clientJavaScriptFiles.length === 0) {
    throw new Error(`Generated project is missing its client JavaScript: ${projectRoot}`);
  }

  const unresolvedVariables = new Set();
  for (const filePath of clientJavaScriptFiles) {
    const content = readFileSync(filePath, 'utf8');
    for (const match of content.matchAll(/process\.env\.(EXPO_PUBLIC_[A-Z0-9_]+)/g)) {
      unresolvedVariables.add(match[1]);
    }
  }

  if (unresolvedVariables.size > 0) {
    throw new Error(
      `Client bundle contains unresolved public variables: ${[...unresolvedVariables].join(', ')} (${clientJavaScriptFiles.join(', ')})`
    );
  }
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rn-expo-template-matrix-'));
try {
  run('npm', ['pack', root, '--pack-destination', temporaryDirectory], root);
  const tarball = readdirSync(temporaryDirectory).find(file => file.endsWith('.tgz'));
  if (!tarball) {
    throw new Error('npm pack did not produce a template tarball.');
  }

  const matrixEnv = {
    ...process.env,
    RN_EXPO_TEMPLATE_REFERENCE: join(temporaryDirectory, tarball),
  };

  for (const sdk of sdks) {
    const projectName = `sdk-${sdk}`;
    const projectRoot = join(temporaryDirectory, projectName);
    run(
      'node',
      [
        join(root, 'scripts/template-cli.mjs'),
        projectName,
        '--app-id',
        `com.template.sdk${sdk}`,
        '--sdk',
        String(sdk),
      ],
      temporaryDirectory,
      matrixEnv
    );
    run('npx', ['expo', 'config', '--type', 'public'], projectRoot);
    run('npx', ['tsc', '--noEmit', '--pretty', 'false'], projectRoot);
    run('npm', ['run', 'lint'], projectRoot);
    run('npx', ['expo', 'export', '--platform', 'web'], projectRoot);
    verifyGeneratedOutput(projectRoot, matrixEnv.RN_EXPO_TEMPLATE_REFERENCE);
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
