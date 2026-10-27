import { createRequestClient, type RequestConfig } from 'expo-template-kit';

import { apiBaseURL } from '@/config/environment';

/**
 * Project-owned request defaults. Configure product-specific transport values
 * here instead of making the shared package depend on this project's env.
 */
export const apiRequestConfig = {
  baseURL: apiBaseURL,
  timeoutMs: 30_000,
  successCode: '10000',
} satisfies RequestConfig;

export const api = createRequestClient(apiRequestConfig);
