<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';

  const sessionId = $page.params.sessionId;

  let lifeContext = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('life_context')
      .eq('id', sessionId)
      .single();
    if (data) {
      lifeContext = data.life_context || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveLifeContext, 600);
  }

  async function saveLifeContext() {
    console.log('Updating session:', sessionId, 'life_context:', lifeContext);
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ life_context: lifeContext })
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
    // Fetch the order from the DB
    const { data, error } = await supabase
      .from('question_order')
      .select('order')
      .eq('step_id', 'step1')
      .single();

    if (data && data.order && Array.isArray(data.order)) {
      const order = data.order;
      const currentIndex = order.indexOf('life_context');
      const urlParams = get(page).url.searchParams;
      const fromOnboarding = urlParams.get('from') === 'onboarding';
      if (currentIndex !== -1 && currentIndex < order.length - 1) {
        const nextQuestion = order[currentIndex + 1];
        const nextUrl = fromOnboarding
          ? `/questionnaire/${sessionId}/step1/${nextQuestion}?from=onboarding`
          : `/questionnaire/${sessionId}/step1/${nextQuestion}`;
        goto(nextUrl);
      } else {
        // If last question, go to step2
        const step2Url = fromOnboarding
          ? `/questionnaire/${sessionId}/step2?from=onboarding`
          : `/questionnaire/${sessionId}/step2`;
        goto(step2Url);
      }
    }
  }

  function goToBack() {
    goto(`/questionnaire/${sessionId}/step1/personality_values`);
  }
</script>

<svelte:head>
  <title>Step 1: Your Life Context - UniqU</title>
</svelte:head>

<QuestionCard
  stepHeading="Step 1: Your Current Situation"
  title="Your Life Context"
  emoji="🌟"
  explainer="Share any relevant context:"
  explainerColor="green"
  explainerBullets={["Current life stage and priorities", "Geographic preferences or constraints", "Family considerations or other commitments"]}
  textareaPlaceholder="Tell us about your current life situation and any important context..."
  bind:textareaValue={lifeContext}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel="Next"
  backLabel="Back"
  disabled={isSaving}
/> 