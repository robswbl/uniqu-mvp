<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;

  let emotionalLandscape = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isLastStep1Question = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('emotional_landscape')
      .eq('id', sessionId)
      .single();
    if (data) {
      emotionalLandscape = data.emotional_landscape || '';
    }

    // Fetch the last Step 1 question from question_order
    const { data: orderData, error } = await supabase
      .from('question_order')
      .select('order')
      .eq('step_id', 'step1')
      .single();
    if (orderData && orderData.order && Array.isArray(orderData.order) && orderData.order.length > 0) {
      isLastStep1Question = orderData.order[orderData.order.length - 1] === 'emotional_landscape';
    } else {
      isLastStep1Question = false;
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveEmotional, 600);
  }

  async function saveEmotional() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ emotional_landscape: emotionalLandscape })
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
    if (isLastStep1Question) {
      const urlParams = get(page).url.searchParams;
      const fromOnboarding = urlParams.get('from') === 'onboarding';
      const step2Url = fromOnboarding
        ? `/questionnaire/${sessionId}/step2?from=onboarding`
        : `/questionnaire/${sessionId}/step2`;
      goto(step2Url);
    } else {
      // If not last, go to the next question (implement as needed)
    }
  }

  function goToBack() {
    goto(`/questionnaire/${sessionId}/step1/doubts_barriers`);
  }
</script>

<svelte:head>
  <title>{$t('step1.emotional_landscape.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
  title={$t('step1.emotional_landscape.title')}
  emoji="💭"
  explainer={$t('step1.emotional_landscape.explainer')}
  explainerColor="indigo"
  textareaPlaceholder={$t('step1.emotional_landscape.textarea_placeholder')}
  bind:textareaValue={emotionalLandscape}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={isLastStep1Question ? $t('step1.emotional_landscape.continue_to_step2') : $t('buttons.next')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
/>