<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;
  let ikigaiLove = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;

  onMount(async () => {
    const { data } = await supabase
      .from('questionnaire_sessions')
      .select('ikigai_love')
      .eq('id', sessionId)
      .single();
    if (data) {
      ikigaiLove = data.ikigai_love || '';
    }
  });

  function handleInput() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isSaving = true;
    saveStatus = 'Saving...';
    saveTimeout = setTimeout(saveIkigaiLove, 600);
  }

  async function saveIkigaiLove() {
    const { error } = await supabase
      .from('questionnaire_sessions')
      .update({ ikigai_love: ikigaiLove })
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
  function goToBack() {
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const backUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step2?from=onboarding`
      : `/questionnaire/${sessionId}/step2`;
    goto(backUrl);
  }
</script>

<svelte:head>
  <title>{$t('step3.love.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
  stepHeading={$t('step3.love.step_heading')}
  title={$t('step3.love.title')}
  emoji="❤️"
  explainer={$t('step3.love.explainer')}
  explainerColor="red"
  textareaPlaceholder={$t('step3.love.textarea_placeholder')}
  bind:textareaValue={ikigaiLove}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={$t('buttons.next')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-red-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? $t('step3.love.hide_inspiration') : $t('step3.love.show_inspiration')}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">{$t('step3.love.inspiration_text')}</p>
        <p class="text-gray-500 text-xs italic">{$t('step3.love.inspiration_examples')}</p>
      </div>
    {/if}
  </div>
</QuestionCard> 