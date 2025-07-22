<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  const sessionId = $page.params.sessionId;
  $: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';
  function goToLetters() {
    const param = fromOnboarding ? '?from=onboarding' : '';
    goto(`/results/${sessionId}/letters${param}`);
  }
</script>

<svelte:head>
  <title>What Happens Next? | UniqU</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
  <div class="max-w-2xl w-full mx-auto bg-white rounded-2xl shadow-xl p-10 text-center">
    <div class="text-6xl mb-6 animate-bounce">🚀</div>
    <h1 class="text-3xl font-bold text-gray-800 mb-6">What Happens Next?</h1>
    <h2 class="text-xl font-semibold text-indigo-700 mb-4">Your journey doesn't end here!</h2>
    <p class="text-lg text-gray-700 mb-8">
      Now that you've uncovered your unique career insights, you can take the next step: create personalized application letters for your dream companies, explore more resources, or revisit your answers for even deeper clarity. We're here to support you every step of the way!
    </p>
    <button
      class="px-10 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      on:click={goToLetters}
    >
      Go to Application Letters
    </button>
  </div>
</div> 