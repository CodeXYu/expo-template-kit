import Reactotron, { type ReactotronReactNative } from 'reactotron-react-native';

import { isDev, isInt, reactotronHost } from '@/config/environment';

const shouldConnect = isDev || (isInt && Boolean(reactotronHost));
const connectionOptions = reactotronHost
  ? { host: reactotronHost, name: 'Expo App' }
  : { name: 'Expo App' };

/**
 * Reactotron's built-in log plugin starts only after the socket connects and
 * does not forward console.info. Bridge all console levels before the first
 * page renders so logger and direct console output are both observable.
 */
function bridgeConsoleToReactotron(client: ReactotronReactNative) {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  (Object.keys(originalConsole) as (keyof typeof originalConsole)[]).forEach(level => {
    console[level] = (...args) => {
      originalConsole[level](...args);

      const content = args.length === 1 ? args[0] : args;
      if (level === 'warn') {
        client.warn(content);
      } else if (level === 'error') {
        const error = args.find(arg => arg instanceof Error);
        client.error(content, error?.stack);
      } else if (level === 'debug') {
        client.debug(content);
      } else {
        // Reactotron has no info level; console.info is represented as debug.
        client.log(...args);
      }
    };
  });
}

/**
 * Project-owned Reactotron setup. Override the host or plugin options here
 * without changing the shared template package.
 */
function createReactotron() {
  if (!shouldConnect) return undefined;

  const client = Reactotron.configure(connectionOptions)
    .useReactNative({
      asyncStorage: false,
      devTools: false,
      editor: false,
      log: false,
      networking: true,
      overlay: false,
      storybook: false,
    })
    .connect();

  bridgeConsoleToReactotron(client);
  return client;
}

export const reactotron = createReactotron();
