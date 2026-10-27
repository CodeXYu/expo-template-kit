import type { HomePageCopyKeys } from './index.type';

/**
 * Home has no remote state in the starter template. Keep its future request
 * functions here so view code does not gain data-access concerns later.
 */
export function getHomePageCopyKeys(): HomePageCopyKeys {
  return {
    description: 'template.ready_description',
    offline_hint: 'template.offline_hint',
    title: 'template.ready_title',
  };
}
