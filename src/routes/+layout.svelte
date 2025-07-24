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
import { page } from '$app/stores';

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
    {#if $page.params?.sessionId}
      <a href="/dashboard/{$page.params.sessionId}" class="text-2xl font-bold text-indigo-700 hover:underline">{$t('app.title')}</a>
    {:else}
      <a href="/" class="text-2xl font-bold text-indigo-700 hover:underline">{$t('app.title')}</a>
    {/if}
    <div>
      <div class="relative inline-flex items-center">
        <select
          class="appearance-none bg-none p-2 pr-8 border rounded-lg text-base font-normal text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          bind:value={$locale}
          on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
          aria-label="Select language"
        >
          {#each availableLangs as lang}
            <option value={lang.code}>{lang.label}</option>
          {/each}
        </select>
        <svg class="w-4 h-4 absolute right-2 pointer-events-none text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
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
