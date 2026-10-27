#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createProject,
  doctor,
  installLocalTemplate,
  parseCreateArgs,
  supportedExpoSdks,
  updateProject,
} from './template-cli-core.mjs';

const scriptPath = fileURLToPath(import.meta.url);

function printUsage() {
  console.log(`Create: create-rn-expo-app <name> --app-id <reverse-domain-id> [--sdk ${supportedExpoSdks.join('|')}]
Manage: rn-expo-template doctor | update <tag> | use-local <template-path>`);
}

export function main(argv = process.argv.slice(2), executable = basename(process.argv[1] ?? '')) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return;
  }

  if (
    executable === 'create-rn-expo-app' ||
    executable === 'create-expo-kit' ||
    argv.includes('--app-id')
  ) {
    createProject(parseCreateArgs(argv));
    return;
  }

  const [command, argument] = argv;
  if (command === 'doctor') {
    doctor();
    return;
  }
  if (command === 'update') {
    updateProject(argument);
    return;
  }
  if (command === 'use-local') {
    installLocalTemplate(argument);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === scriptPath) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
