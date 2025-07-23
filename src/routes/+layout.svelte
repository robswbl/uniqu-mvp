<script context="module" lang="ts">
  import { setupI18n } from '$lib/i18n';
  // Always set a default locale for SSR
  setupI18n('en');
</script>

<script lang="ts">
import '../app.css';
  import { onMount } from 'svelte';
  import { locale, waitLocale } from '$lib/i18n';
  import { t } from 'svelte-i18n';

  let userLang = '';
  let localeReady = false;

  // SSR-safe: check if window is defined before accessing localStorage
  if (typeof window !== 'undefined') {
    userLang = localStorage.getItem('userLang') || '';
  }

  // Always call setupI18n synchronously with a fallback
  // setupI18n(userLang || 'en'); // This line is now handled by the module script

  let availableLangs = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' }
  ];

  waitLocale().then(() => {
    localeReady = true;
  });

  onMount(() => {
    if (typeof window !== 'undefined') {
      userLang = localStorage.getItem('userLang') || '';
      if (userLang) {
        locale.set(userLang);
        waitLocale();
      }
    }
  });

  function changeLang(lang: string) {
    locale.set(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userLang', lang);
    }
  }
</script>

{#if localeReady}
<div class="min-h-screen flex flex-col">
  <header class="flex items-center justify-between p-4 bg-white shadow">
    <h1 class="text-2xl font-bold text-indigo-700">{$t('app.title')}</h1>
    <div>
      <select
        class="p-2 border rounded"
        bind:value={userLang}
        on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
        aria-label="Select language"
      >
        {#each availableLangs as lang}
          <option value={lang.code}>{lang.label}</option>
        {/each}
      </select>
    </div>
  </header>
  <main class="flex-1">
    <slot />
  </main>
</div>
{/if}
