<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;
  let ikigaiGoodAt = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('ikigai_good_at')
      .eq('id', sessionId)
      .single();
    if (data) {
      ikigaiGoodAt = data.ikigai_good_at || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveIkigaiGoodAt, 600);
  }

  async function saveIkigaiGoodAt() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ ikigai_good_at: ikigaiGoodAt })
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
      ? `/questionnaire/${sessionId}/step3/inspires?from=onboarding`
      : `/questionnaire/${sessionId}/step3/inspires`;
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
      const currentIndex = order.indexOf('good_at');
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
      if (currentIndex > 0) {
        const prevQuestion = order[currentIndex - 1];
        const prevUrl = fromOnboarding
          ? `/questionnaire/${sessionId}/step3/${prevQuestion}?from=onboarding`
          : `/questionnaire/${sessionId}/step3/${prevQuestion}`;
        goto(prevUrl);
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
  <title>{$t('step3.good_at.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
  stepHeading={$t('step3.good_at.step_heading')}
  title={$t('step3.good_at.title')}
  emoji="⭐"
  explainer={$t('step3.good_at.explainer')}
  explainerColor="blue"
  textareaPlaceholder={$t('step3.good_at.textarea_placeholder')}
  bind:textareaValue={ikigaiGoodAt}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={$t('buttons.next')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-blue-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? $t('step3.good_at.hide_inspiration') : $t('step3.good_at.show_inspiration')}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">{$t('step3.good_at.inspiration_text')}</p>
        <p class="text-gray-500 text-xs italic">{$t('step3.good_at.inspiration_examples')}</p>
      </div>
    {/if}
  </div>
</QuestionCard> 