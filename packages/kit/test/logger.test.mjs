import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);

function loadLogger() {
  const source = readFileSync(join(process.cwd(), 'src/utils/logger.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const calls = [];
  const console = Object.fromEntries(
    ['log', 'info', 'warn', 'error'].map(level => [
      level,
      (...args) => calls.push([level, ...args]),
    ])
  );

  vm.runInNewContext(output, {
    __DEV__: true,
    console,
    exports: module.exports,
    module,
    require: nodeRequire,
  });

  return { calls, logger: module.exports.logger };
}

test('prefixed loggers use the latest shared configuration', () => {
  const { calls, logger } = loadLogger();
  const featureLogger = logger.create('feature');

  logger.setConfig({ enabled: false });
  featureLogger.info('hidden');
  assert.equal(calls.length, 0);

  logger.setConfig({ enabled: true, enableTimestamp: false });
  featureLogger.info('visible');
  assert.deepEqual(calls, [['info', '[feature]', 'visible']]);
});
