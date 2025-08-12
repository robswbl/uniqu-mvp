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
let userData: any = null;
let showProfileMenu = false;
let profileMenuRef: HTMLElement | null = null;
let profileButtonRef: HTMLElement | null = null;

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

// Reactive statement to fetch user data when userId changes
$: if (userId && !userData) {
  fetchUserData();
}

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
  // Guard: If userId is missing and not on public routes, redirect to root
  if (typeof window !== 'undefined') {
    const currentUserId = localStorage.getItem('userId');
    const publicRoutes = ['/', '/signup'];
    const currentPath = window.location.pathname;
    
    if (!currentUserId && !publicRoutes.includes(currentPath)) {
      goto('/');
      return;
    }
    
    // Update the top-level userId variable
    if (currentUserId) {
      userId = currentUserId;
      await fetchUserLanguage();
      await fetchUserData();
    } else {
      userLang = localStorage.getItem('userLang') || '';
      if (userLang) {
        locale.set(userLang);
        waitLocale();
      }
    }
  }
});

onMount(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      showProfileMenu &&
      profileMenuRef &&
      !profileMenuRef.contains(event.target as Node) &&
      profileButtonRef &&
      !profileButtonRef.contains(event.target as Node)
    ) {
      showProfileMenu = false;
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
});

async function fetchUserData() {
  if (userId) {
    const { data, error } = await supabase
      .from('users')
      .select('user_firstname, user_lastname, user_email')
      .eq('user_uuid', userId)
      .single();
    if (!error && data) {
      userData = data;
    }
  }
}

async function changeLang(lang: string) {
  locale.set(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('userLang', lang);
  }
  // If userId is available, update in DB
  if (userId) {
    const { error } = await supabase
      .from('users')
      .update({ user_language: lang })
      .eq('user_uuid', userId);
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
    <div class="flex items-center space-x-4">
      {#if $page.params?.sessionId}
        <a 
          href="/dashboard/{$page.params.sessionId}" 
          class="text-gray-700 hover:text-indigo-600 font-medium transition-colors flex items-center space-x-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"/>
          </svg>
          <span>{$t('layout.dashboard')}</span>
        </a>
      {/if}
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
      
      <!-- Profile Avatar -->
      {#if userData}
        <div class="relative">
          <button
            bind:this={profileButtonRef}
            on:click={() => showProfileMenu = !showProfileMenu}
            class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            type="button"
          >
            <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {userData.user_firstname ? userData.user_firstname.charAt(0).toUpperCase() : 'U'}
            </div>
            <span class="text-sm text-gray-700 font-medium hidden sm:block">
              {userData.user_firstname || 'User'}
            </span>
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <!-- Profile Dropdown Menu -->
          {#if showProfileMenu}
            <div bind:this={profileMenuRef} class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <a
                href={$page.params?.sessionId ? `/profile/${$page.params.sessionId}` : '/profile'}
                class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {$t('layout.profile_settings')}
              </a>
              <div class="border-t border-gray-200 my-1"></div>
              <button
                on:click={() => { 
                  showProfileMenu = false; 
                  // Clear user data from localStorage
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userLang');
                  }
                  // Clear user data
                  userData = null;
                  userId = '';
                  goto('/'); 
                }}
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                type="button"
              >
                {$t('layout.sign_out')}
              </button>
            </div>
          {/if}
        </div>
      {/if}
      
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
