<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;
  let ikigaiCareAbout = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('ikigai_care_about')
      .eq('id', sessionId)
      .single();
    if (data) {
      ikigaiCareAbout = data.ikigai_care_about || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveIkigaiCareAbout, 600);
  }

  async function saveIkigaiCareAbout() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ ikigai_care_about: ikigaiCareAbout })
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
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const nextUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step3/good_at?from=onboarding`
      : `/questionnaire/${sessionId}/step3/good_at`;
    goto(nextUrl);
  }
  async function goToBack() {
    const { data } = await supabase
      .from('question_order')
      .select('order')
      .eq('step_id', 'step3')
      .single();
    if (data && data.order && Array.isArray(data.order)) {
      const order = data.order;
      const currentIndex = order.indexOf('care_about');
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
      if (currentIndex > 0) {
        const prevQuestion = order[currentIndex - 1];
        const prevUrl = fromOnboarding
          ? `/questionnaire/${sessionId}/step3/${prevQuestion}?from=onboarding`
          : `/questionnaire/${sessionId}/step3/${prevQuestion}`;
        goto(prevUrl);
      } else if (currentIndex === 0) {
        // Go to last step2 question
        const { data: step2Data } = await supabase
          .from('question_order')
          .select('order')
          .eq('step_id', 'step2')
          .single();
        if (step2Data && step2Data.order && Array.isArray(step2Data.order) && step2Data.order.length > 0) {
          const lastStep2 = step2Data.order[step2Data.order.length - 1];
          const prevUrl = fromOnboarding
            ? `/questionnaire/${sessionId}/step2/${lastStep2}?from=onboarding`
            : `/questionnaire/${sessionId}/step2/${lastStep2}`;
          goto(prevUrl);
        } else {
          // fallback to step2 root
          const prevUrl = fromOnboarding
            ? `/questionnaire/${sessionId}/step2?from=onboarding`
            : `/questionnaire/${sessionId}/step2`;
          goto(prevUrl);
        }
      } else {
        const onboardingUrl = fromOnboarding
          ? `/onboarding/${sessionId}?from=onboarding`
          : `/onboarding/${sessionId}`;
        goto(onboardingUrl);
      }
    }
  }
</script>

<svelte:head>
  <title>Step 3: What do you care about? - Ikigai</title>
</svelte:head>

<QuestionCard
  stepHeading={$t('step3.care_about.step_heading')}
  title={$t('step3.care_about.title')}
  emoji="🌍"
  explainer={$t('step3.care_about.explainer')}
  explainerColor="green"
  textareaPlaceholder={$t('step3.care_about.textarea_placeholder')}
  bind:textareaValue={ikigaiCareAbout}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={$t('buttons.next')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-green-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? $t('step3.care_about.hide_inspiration') : $t('step3.care_about.show_inspiration')}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">{$t('step3.care_about.inspiration_text')}</p>
        <p class="text-gray-500 text-xs italic">{$t('step3.care_about.inspiration_examples')}</p>
      </div>
    {/if}
  </div>
</QuestionCard> 