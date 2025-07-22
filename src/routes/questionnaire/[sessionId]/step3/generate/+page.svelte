<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fade, scale } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';

  const sessionId = $page.params.sessionId;
  let isGenerating = false;
  let showCard = false;

  onMount(() => {
    setTimeout(() => {
      showCard = true;
    }, 600); // longer delay for anticipation
  });

  async function handleGenerate() {
    isGenerating = true;
    await fetch(`/questionnaire/${sessionId}/step3/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'regenerate' })
    });
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const nextUrl = fromOnboarding
      ? `/results/${sessionId}/generating?from=onboarding`
      : `/results/${sessionId}/generating`;
    goto(nextUrl);
  }
</script>

<svelte:head>
  <title>Congratulations! Ready to Generate Your Results?</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6">
  {#if showCard}
    <div
      class="max-w-3xl w-2/3 mx-auto bg-white rounded-2xl shadow-xl p-8 text-center"
      in:scale={{ duration: 2000, start: 0.95 }}
    >
      <div class="flex flex-col items-center">
        <div class="text-6xl mb-6 animate-bounce" in:fade={{ duration: 2000 }}>🎉</div>
      </div>
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Congratulations on completing the questions!</h1>
      <p class="text-lg text-gray-700 mb-8">
        You’ve shown incredible dedication and self-reflection. That’s what sets successful people apart. When you click <strong>Generate</strong>, you’ll receive a personalized analysis—a big revelation about yourself that could change your trajectory moving forward.
      </p>
      <p class="text-md text-gray-600 mb-12">
        Take a deep breath and get ready for your next chapter. We’re excited to show you what you’ve discovered!
      </p>
      <div class="flex justify-center">
        <button
          class="px-12 py-4 text-2xl font-bold rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          on:click={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Now'}
        </button>
      </div>
    </div>
  {/if}
</div> 