<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

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
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const nextUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step3/want_to_be?from=onboarding`
      : `/questionnaire/${sessionId}/step3/want_to_be`;
    goto(nextUrl);
  }
  function goToBack() {
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const backUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step3/care_about?from=onboarding`
      : `/questionnaire/${sessionId}/step3/care_about`;
    goto(backUrl);
  }
</script>

<svelte:head>
  <title>{$t('step3.inspires.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
  stepHeading={$t('step3.inspires.step_heading')}
  title={$t('step3.inspires.title')}
  emoji="🚀"
  explainer={$t('step3.inspires.explainer')}
  explainerColor="orange"
  textareaPlaceholder={$t('step3.inspires.textarea_placeholder')}
  bind:textareaValue={ikigaiInspires}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={$t('buttons.next')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-orange-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? $t('step3.inspires.hide_inspiration') : $t('step3.inspires.show_inspiration')}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">{$t('step3.inspires.inspiration_text')}</p>
        <p class="text-gray-500 text-xs italic">{$t('step3.inspires.inspiration_examples')}</p>
      </div>
    {/if}
  </div>
</QuestionCard> 