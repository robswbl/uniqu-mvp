<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import QuestionCard from '$lib/QuestionCard.svelte';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';
  import { locale } from '$lib/i18n';

  const sessionId = $page.params.sessionId;
  let ikigaiWantToBe = '';
  let saveStatus = '';
  let isSaving = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let showInspiration = false;
  let recognizing = false;
  let recognition;

  // Map app locale to Web Speech API language codes
  const speechLangMap = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
    es: 'es-ES'
  };

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
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const nextUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step3/generate?from=onboarding`
      : `/questionnaire/${sessionId}/step3/generate`;
    goto(nextUrl);
  }
  function goToBack() {
    const urlParams = get(page).url.searchParams;
    const fromOnboarding = urlParams.get('from') === 'onboarding';
    const backUrl = fromOnboarding
      ? `/questionnaire/${sessionId}/step3/inspires?from=onboarding`
      : `/questionnaire/${sessionId}/step3/inspires`;
    goto(backUrl);
  }

  function startRecognition() {
    // @ts-ignore
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    // @ts-ignore
    recognition = new webkitSpeechRecognition();
    let currentLocale = get(locale) as keyof typeof speechLangMap;
    if (!(currentLocale in speechLangMap)) currentLocale = 'en';
    const langCode = speechLangMap[currentLocale];
    recognition.lang = langCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // @ts-ignore
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      ikigaiWantToBe = ikigaiWantToBe ? ikigaiWantToBe.trim() + '\n' + result : result;
      handleInput();
    };
    recognition.onend = () => recognizing = false;
    recognition.onerror = () => recognizing = false;
    recognition.start();
    recognizing = true;
  }
</script>

<svelte:head>
  <title>{$t('step3.want_to_be.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
  stepHeading={$t('step3.want_to_be.step_heading')}
  title={$t('step3.want_to_be.title')}
  emoji="🎯"
  explainer={$t('step3.want_to_be.explainer')}
  explainerColor="purple"
  textareaPlaceholder={$t('step3.want_to_be.textarea_placeholder')}
  bind:textareaValue={ikigaiWantToBe}
  saveStatus={saveStatus}
  onInput={handleInput}
  onNext={goToNext}
  onBack={goToBack}
  nextLabel={$t('step3.want_to_be.finish')}
  backLabel={$t('buttons.back')}
  disabled={isSaving}
>
  <div class="mb-4">
    <button type="button" class="text-sm text-purple-700 underline" on:click={() => showInspiration = !showInspiration}>
      {showInspiration ? $t('step3.want_to_be.hide_inspiration') : $t('step3.want_to_be.show_inspiration')}
    </button>
    {#if showInspiration}
      <div class="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3 mt-2">
        <p class="text-gray-600 text-sm">{$t('step3.want_to_be.inspiration_text')}</p>
        <p class="text-gray-500 text-xs italic">{$t('step3.want_to_be.inspiration_examples')}</p>
      </div>
    {/if}
  </div>
  <div class="flex items-center mt-4">
    <button
      type="button"
      class="flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-lg shadow-sm hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
      on:click={startRecognition}
      disabled={recognizing}
      aria-label="{$t('step3.want_to_be.speak_button') || 'Speak'}"
    >
      <span class="mr-2">🎤</span>
      {recognizing ? ($t('step3.want_to_be.listening') || 'Listening...') : ($t('step3.want_to_be.speak') || 'Speak')}
    </button>
    <span class="ml-3 text-sm text-gray-500">{recognizing ? ($t('step3.want_to_be.listening') || 'Listening...') : ''}</span>
  </div>
</QuestionCard> 