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
import { supabase } from '$lib/supabaseClient';
import { goto } from '$app/navigation';

let userLang = '';
let localeReady = false;
let userId = '';
let errorMsg = '';

// SSR-safe: check if window is defined before accessing localStorage
if (typeof window !== 'undefined') {
  userLang = localStorage.getItem('userLang') || '';
  // Try to get userId from localStorage/sessionStorage or URL if available
  userId = localStorage.getItem('userId') || '';
}

let availableLangs = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' }
];

async function fetchUserLanguage() {
  if (userId) {
    const { data, error } = await supabase
      .from('users')
      .select('user_language')
      .eq('user_uuid', userId)
      .single();
    if (data && data.user_language) {
      userLang = data.user_language;
      locale.set(userLang);
      localStorage.setItem('userLang', userLang);
    }
  }
}

waitLocale().then(() => {
  localeReady = true;
});

onMount(async () => {
  // Guard: If userId is missing and not on root, redirect to root
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId');
    if (!userId && window.location.pathname !== '/') {
      goto('/');
      return;
    }
  }
  // If userId is available, fetch language from DB
  if (userId) {
    await fetchUserLanguage();
  } else if (typeof window !== 'undefined') {
    userLang = localStorage.getItem('userLang') || '';
    if (userLang) {
      locale.set(userLang);
      waitLocale();
    }
  }
});

async function changeLang(lang: string) {
  locale.set(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('userLang', lang);
  }
  // If userId is available, update in DB
  if (userId) {
    // Debug: log userId and session
    if (import.meta.env && import.meta.env.DEV) {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[LANG PATCH DEBUG] userId:', userId);
      console.log('[LANG PATCH DEBUG] session:', session);
    }
    const { error, data, status } = await supabase
      .from('users')
      .update({ user_language: lang })
      .eq('user_uuid', userId);
    // Debug: log full response
    if (import.meta.env && import.meta.env.DEV) {
      console.log('[LANG PATCH DEBUG] PATCH response:', { error, data, status });
    }
    if (error) {
      errorMsg = 'Failed to update language in your profile. Please try again.';
    } else {
      errorMsg = '';
    }
  } else {
    errorMsg = 'You must be logged in to save your language preference.';
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
        bind:value={$locale}
        on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
        aria-label="Select language"
      >
        {#each availableLangs as lang}
          <option value={lang.code}>{lang.label}</option>
        {/each}
      </select>
      {#if errorMsg}
        <div class="text-red-600 text-xs mt-1">{errorMsg}</div>
      {/if}
    </div>
  </header>
  <main class="flex-1">
    <slot />
  </main>
</div>
{/if}
