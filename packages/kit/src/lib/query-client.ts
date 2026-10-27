import {
  MutationCache,
  QueryCache,
  QueryClient,
  type QueryClientConfig,
} from '@tanstack/react-query';

import { captureException } from '../services/monitoring/error-reporting';
import { isRetryable } from '../utils/error';
import { BusinessError, CancelError, RequestError } from '../utils/request';

function isHandledRequestError(error: unknown) {
  return (
    error instanceof RequestError || error instanceof BusinessError || error instanceof CancelError
  );
}

/**
 * The template uses a conservative default cache strategy so product teams get
 * sensible behavior without surprising aggressive refetches out of the box.
 *
 * Example:
 * ```ts
 * const profileQuery = useQuery({
 *   queryKey: ['profile'],
 *   queryFn: () => get<Profile>('/user/profile'),
 * });
 * ```
 */
export function createDefaultQueryClient(config: QueryClientConfig = {}) {
  return new QueryClient({
    ...config,
    queryCache:
      config.queryCache ??
      new QueryCache({
        onError: (error, query) => {
          if (isHandledRequestError(error)) {
            return;
          }

          captureException(error, {
            layer: 'react-query',
            type: 'query',
            queryKey: query.queryKey,
          });
        },
      }),
    mutationCache:
      config.mutationCache ??
      new MutationCache({
        onError: (error, _variables, _context, mutation) => {
          if (isHandledRequestError(error)) {
            return;
          }

          captureException(error, {
            layer: 'react-query',
            type: 'mutation',
            mutationKey: mutation.options.mutationKey,
          });
        },
      }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => failureCount < 1 && isRetryable(error),
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
      ...config.defaultOptions,
    },
  });
}
