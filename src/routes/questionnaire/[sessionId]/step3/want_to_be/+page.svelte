<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';

  const sessionId = $page.params.sessionId;
  let ikigaiWantToBe = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('ikigai_want_to_be')
      .eq('id', sessionId)
      .single();
    if (data) {
      ikigaiWantToBe = data.ikigai_want_to_be || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveIkigaiWantToBe, 600);
  }

  async function saveIkigaiWantToBe() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ ikigai_want_to_be: ikigaiWantToBe })
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
    goto(`/questionnaire/${sessionId}/step3/generate`);
  }
  function goToBack() {
    goto(`/questionnaire/${sessionId}/step3/inspires`);
  }
</script>

<svelte:head>
  <title>Step 3: Who do you want to become? - Ikigai</title>
</svelte:head>

<QuestionCard
  stepHeading="Step 3: Discover Your Ikigai"
  title="Who do you want to become?"
  emoji="🎯"
  explainer="Describe the person you aspire to be, and the impact you want to have."
  explainerColor="purple"
  textareaPlaceholder="Who do you want to become? What impact do you want to have?"
  bind:textareaValue={ikigaiWantToBe}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel="Finish"
  backLabel="Back"
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-purple-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? 'Hide inspiration' : 'Show inspiration'}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">Think about the qualities you admire in others, the legacy you want to leave, or the kind of impact you hope to have on your community or the world.</p>
        <p class="text-gray-500 text-xs italic">Examples: I want to be known as someone who lifts others up. I hope to inspire my children to follow their dreams. I want to be a leader who brings out the best in my team.</p>
      </div>
    {/if}
  </div>
</QuestionCard> 