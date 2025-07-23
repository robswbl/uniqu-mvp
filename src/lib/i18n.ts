import { register, init, getLocaleFromNavigator, locale, waitLocale } from 'svelte-i18n';

// Register languages (add more as needed)
register('en', () => import('./i18n/en.json'));
register('de', () => import('./i18n/de.json'));
register('fr', () => import('./i18n/fr.json'));
register('it', () => import('./i18n/it.json'));
register('es', () => import('./i18n/es.json'));

export function setupI18n(userLang?: string) {
  init({
    fallbackLocale: 'en',
    initialLocale: userLang || getLocaleFromNavigator(),
    loadingDelay: 200,
    warnOnMissingMessages: true
  });
}

export { locale, waitLocale }; 