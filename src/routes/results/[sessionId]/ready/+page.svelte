<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';
  const sessionId = $page.params.sessionId;
  $: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';
  function revealFirstLetter() {
    const param = fromOnboarding ? '?from=onboarding' : '';
    goto(`/results/${sessionId}/reflection_letter${param}`);
  }
</script>

<svelte:head>
  <title>{$t('ready.title')} | {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
  <div class="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-xl p-10 text-center">
    <div class="text-6xl mb-6 animate-bounce">🎉</div>
    <h1 class="text-3xl font-bold text-gray-800 mb-6">{$t('ready.heading')}</h1>
    <h2 class="text-xl font-semibold text-pink-700 mb-4">{$t('ready.subheading')}</h2>
    <p class="text-lg text-gray-700 mb-8">
      {$t('ready.description')}
    </p>
    <button
      class="px-10 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      on:click={revealFirstLetter}
    >
      {$t('ready.reveal_first_insight')}
    </button>
  </div>
</div> 