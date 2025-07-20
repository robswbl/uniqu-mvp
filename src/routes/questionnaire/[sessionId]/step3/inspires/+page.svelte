<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';

  const sessionId = $page.params.sessionId;
  let ikigaiInspires = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('ikigai_inspires')
      .eq('id', sessionId)
      .single();
    if (data) {
      ikigaiInspires = data.ikigai_inspires || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveIkigaiInspires, 600);
  }

  async function saveIkigaiInspires() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ ikigai_inspires: ikigaiInspires })
      .eq('id', sessionId);
    if (error) {
      saveStatus = 'Error saving';
    } else {
      saveStatus = 'Saved ✓';
    }
    isSaving = false;
    setTimeout(() => saveStatus = '', 1200);
  }

  function goToNext() {
    goto(`/questionnaire/${sessionId}/step3/want_to_be`);
  }
  function goToBack() {
    goto(`/questionnaire/${sessionId}/step3/care_about`);
  }
</script>

<svelte:head>
  <title>Step 3: What inspires you? - Ikigai</title>
</svelte:head>

<QuestionCard
  stepHeading="Step 3: Discover Your Ikigai"
  title="What inspires you?"
  emoji="🚀"
  explainer="💡 Need inspiration?"
  explainerColor="orange"
  textareaPlaceholder="What industries, fields, or people inspire you?"
  bind:textareaValue={ikigaiInspires}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel="Next"
  backLabel="Back"
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-orange-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? 'Hide inspiration' : 'Show inspiration'}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">Which industries or fields capture your imagination? What draws you to them - innovation, helping people, creativity, or something else?</p>
        <p class="text-gray-500 text-xs italic">Examples: Software because I like creating things people use. Animal welfare because I want to help them. Recruiting because I meet interesting people.</p>
      </div>
    {/if}
  </div>
</QuestionCard> 