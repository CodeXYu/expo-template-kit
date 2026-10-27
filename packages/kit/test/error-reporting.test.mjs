import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);

function loadTypeScriptModule(filePath, requireModule, runtimeConsole = console) {
  const source = readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  const context = {
    __DEV__: true,
    console: runtimeConsole,
    exports: module.exports,
    module,
    require: requireModule,
  };

  vm.runInNewContext(output, context, { filename: filePath });
  return module.exports;
}

function loadErrorReporting() {
  const calls = [];
  const testConsole = Object.fromEntries(
    ['log', 'info', 'warn', 'error'].map(level => [
      level,
      (...args) => calls.push([level, ...args]),
    ])
  );
  const loggerModule = loadTypeScriptModule(
    join(process.cwd(), 'src/utils/logger.ts'),
    name => {
      if (name === 'dayjs') {
        return nodeRequire('dayjs');
      }
      throw new Error(`Unexpected logger dependency: ${name}`);
    },
    testConsole
  );
  const errorReporting = loadTypeScriptModule(
    join(process.cwd(), 'src/services/monitoring/error-reporting.ts'),
    name => {
      if (name === '../../utils/logger') {
        return loggerModule;
      }
      throw new Error(`Unexpected error-reporting dependency: ${name}`);
    },
    testConsole
  );

  loggerModule.logger.setConfig({
    enabled: true,
    enableTimestamp: false,
  });
  return { calls, errorReporting, logger: loggerModule.logger };
}

test('initializes a project reporter once and forwards monitoring events', () => {
  const { errorReporting } = loadErrorReporting();
  const received = [];
  const reporter = {
    init: () => received.push(['init']),
    captureException: (error, context) => received.push(['exception', error, context]),
    captureMessage: (message, context) => received.push(['message', message, context]),
  };
  const error = new Error('request failed');

  errorReporting.initErrorReporting(reporter);
  errorReporting.initErrorReporting();
  errorReporting.captureException(error, { orderId: '42' });
  errorReporting.captureMessage('retry exhausted', { attempts: 3 });

  assert.deepEqual(received, [
    ['init'],
    ['exception', error, { orderId: '42' }],
    ['message', 'retry exhausted', { attempts: 3 }],
  ]);
});

test('falls back to the logger when reporter initialization fails', () => {
  const { calls, errorReporting } = loadErrorReporting();

  errorReporting.initErrorReporting({
    init: () => {
      throw new Error('sdk unavailable');
    },
    captureException: () => {},
    captureMessage: () => {},
  });
  errorReporting.captureException(new Error('still reported'));

  assert.equal(calls[0][0], 'error');
  assert.equal(calls[0].includes('Failed to initialize error reporter; using logger'), true);
  assert.equal(
    calls.some(call => call.includes('Captured exception')),
    true
  );
});

test('does not let reporter failures escape the monitoring boundary', () => {
  const { errorReporting } = loadErrorReporting();

  errorReporting.initErrorReporting({
    init: () => {},
    captureException: () => {
      throw new Error('capture failed');
    },
    captureMessage: () => {
      throw new Error('message failed');
    },
  });

  assert.doesNotThrow(() => errorReporting.captureException(new Error('business error')));
  assert.doesNotThrow(() => errorReporting.captureMessage('business message'));
});

test('page list guards pagination and exposes refresh plus empty states', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/page-kit/page-list/index.tsx'),
    'utf8'
  );

  assert.match(source, /loadingMore \|\| hasMore === false/);
  assert.match(source, /ListEmptyComponent=/);
  assert.match(source, /ListFooterComponent=/);
  assert.match(source, /onRefresh=/);
  assert.match(source, /common\.loading_more/);
  assert.match(source, /common\.no_more/);
});
