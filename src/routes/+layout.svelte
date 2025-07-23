<script lang="ts">
  import { onMount } from 'svelte';
  import { setupI18n, locale, waitLocale } from '$lib/i18n';
  import { t } from 'svelte-i18n';

  let userLang = '';
  let availableLangs = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' }
  ];

  // Load language from localStorage or default
  onMount(() => {
    userLang = localStorage.getItem('userLang') || '';
    setupI18n(userLang);
    waitLocale();
  });

  function changeLang(lang: string) {
    locale.set(lang);
    localStorage.setItem('userLang', lang);
  }
</script>

<div class="min-h-screen flex flex-col">
  <header class="flex items-center justify-between p-4 bg-white shadow">
    <h1 class="text-2xl font-bold text-indigo-700">{$t('app.title')}</h1>
    <div>
      <select
        class="p-2 border rounded"
        bind:value={userLang}
        on:change={(e) => changeLang(e.target.value)}
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
