import { initializeI18n } from '../i18n';
import { waitForPreferencesHydration } from '../stores/use-preferences-store';

/** Complete project-owned startup before the shared route lifecycle becomes ready. */
export async function initializeApp() {
  await Promise.all([initializeI18n(), waitForPreferencesHydration()]);
}
