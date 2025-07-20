<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';

  const sessionId = $page.params.sessionId;

  let doubtsBarriers = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('doubts_barriers')
      .eq('id', sessionId)
      .single();
    if (data) {
      doubtsBarriers = data.doubts_barriers || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveDoubts, 600);
  }

  async function saveDoubts() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ doubts_barriers: doubtsBarriers })
      .eq('id', sessionId);
    if (error) {
      saveStatus = 'Error saving';
    } else {
      saveStatus = 'Saved ✓';
    }
    isSaving = false;
    setTimeout(() => saveStatus = '', 1200);
  }

  async function goToNext() {
    await supabase
      .from('questionnaire_sessions')
      .update({ last_question_step: 'step1', last_question_id: 'emotional_landscape' })
      .eq('id', sessionId);
    goto(`/questionnaire/${sessionId}/step1/emotional_landscape`);
  }

  function goToBack() {
    goto(`/questionnaire/${sessionId}/step1/life_context`);
  }
</script>

<svelte:head>
  <title>Step 1: Doubts & Barriers - UniqU</title>
</svelte:head>

<QuestionCard
  title="Step 1: Doubts & Barriers"
  emoji="🤔"
  explainer="Any doubts or barriers you're facing?"
  explainerColor="indigo"
  textareaPlaceholder="What concerns or obstacles are you thinking about regarding your career path?"
  bind:textareaValue={doubtsBarriers}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel="Next"
  backLabel="Back"
  disabled={isSaving}
/> 