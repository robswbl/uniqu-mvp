<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount, afterUpdate } from 'svelte';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;
  let goals = '';
  let personalityValues = '';
  let lifeContext = '';
  let doubtsBarriers = '';
  let emotionalLandscape = '';
  let coreSummary = '';
  let saveStatus = '';
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isSubmitting = false;
  let hasUnsavedChanges = false;
  let fromOnboarding = false;

  onMount(async () => {
    const { data, error } = await supabase
      .from('questionnaire_sessions')
      .select('goals, personality_values, life_context, doubts_barriers, emotional_landscape, core_summary')
      .eq('id', sessionId)
      .single();

    if (data) {
      goals = data.goals || '';
      personalityValues = data.personality_values || '';
      lifeContext = data.life_context || '';
      doubtsBarriers = data.doubts_barriers || '';
      emotionalLandscape = data.emotional_landscape || '';
      coreSummary = data.core_summary || '';
    }
    fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';
  });

  function markAsChanged() {
    hasUnsavedChanges = true;
    saveProgress();
  }

  async function saveProgress() {
    saveStatus = $t('step1.overview.saving');
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      const { error } = await supabase
        .from('questionnaire_sessions')
        .update({
          status: 'in-progress',
          goals,
          personality_values: personalityValues,
          life_context: lifeContext,
          doubts_barriers: doubtsBarriers,
          emotional_landscape: emotionalLandscape,
          core_summary: coreSummary
        })
        .eq('id', sessionId);

      if (error) {
        saveStatus = $t('step1.overview.error_saving');
        setTimeout(() => saveStatus = '', 3000);
      } else {
        saveStatus = $t('step1.overview.saved');
        hasUnsavedChanges = false;
        setTimeout(() => saveStatus = '', 2000);
      }
    }, 1000);
  }

  function goToDashboard() {
    goto(`/dashboard/${sessionId}`);
  }

  function goToIkigai() {
    goto(`/questionnaire/${sessionId}/ikigai`);
  }

  const handleSubmit: SubmitFunction = () => {
    isSubmitting = true;
    return async ({ result }) => {
      if (result.type === 'redirect') {
        await goto(result.location);
      }
      isSubmitting = false;
    };
  }
</script>

<svelte:head>
  <title>{$t('step1.overview.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
  <div class="max-w-4xl mx-auto">
    <!-- Header Navigation -->
    <div class="flex justify-between items-center mb-6">
      <button 
        on:click={goToDashboard}
        class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
        type="button"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        <span>{$t('step1.overview.back_to_dashboard')}</span>
      </button>
      <div class="flex items-center space-x-4">
        {#if hasUnsavedChanges}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center space-x-2">
            <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <span class="text-yellow-800 text-sm">{$t('step1.overview.unsaved_changes')}</span>
          </div>
        {/if}
        {#if saveStatus}
          <div class="text-sm px-3 py-1 rounded"
               class:text-green-600={saveStatus.includes($t('step1.overview.saved'))}
               class:text-blue-600={saveStatus.includes($t('step1.overview.saving'))}
               class:text-red-600={saveStatus.includes($t('step1.overview.error_saving'))}>
            {saveStatus}
          </div>
        {/if}
      </div>
    </div>
    <!-- Progress Header -->
    <div class="text-center mb-8">
      <div class="flex items-center justify-center space-x-2 mb-4">
        <div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</div>
        <div class="w-16 h-0.5 bg-gray-300"></div>
        <div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
        <div class="w-16 h-0.5 bg-gray-300"></div>
        <div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
      </div>
      <h1 class="text-3xl font-bold text-gray-800 mb-2">{$t('step1.overview.heading')}</h1>
      <p class="text-lg text-gray-600">{$t('step1.overview.intro')}</p>
    </div>
    <form method="POST" use:enhance={handleSubmit} class="space-y-8">
      <!-- Life Context Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span class="text-2xl">🌟</span>
          </div>
          <h2 class="text-2xl font-semibold text-gray-800">{$t('step1.overview.life_context_title')}</h2>
        </div>
        <div class="space-y-4">
          <div class="bg-green-50 p-4 rounded-lg">
            <p class="text-green-800 text-sm mb-2">💡 <strong>{$t('step1.overview.life_context_explainer')}</strong></p>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• {$t('step1.overview.life_context_bullet1')}</li>
              <li>• {$t('step1.overview.life_context_bullet2')}</li>
              <li>• {$t('step1.overview.life_context_bullet3')}</li>
            </ul>
          </div>
          <label for="life-context-textarea" class="sr-only">{$t('step1.overview.life_context_title')}</label>
          <textarea
            id="life-context-textarea"
            bind:value={lifeContext}
            on:input={markAsChanged}
            placeholder={$t('step1.overview.life_context_placeholder')}
            class="w-full h-28 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          ></textarea>
        </div>
      </div>
      <!-- Personality & Values Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-2xl">💎</span>
          </div>
          <h2 class="text-2xl font-semibold text-gray-800">{$t('step1.overview.personality_title')}</h2>
        </div>
        <div class="space-y-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-blue-800 text-sm mb-2">💡 <strong>{$t('step1.overview.personality_explainer')}</strong></p>
            <ul class="text-blue-700 text-sm space-y-1">
              <li>• {$t('step1.overview.personality_bullet1')}</li>
              <li>• {$t('step1.overview.personality_bullet2')}</li>
              <li>• {$t('step1.overview.personality_bullet3')}</li>
            </ul>
          </div>
          <label for="personality-textarea" class="sr-only">{$t('step1.overview.personality_title')}</label>
          <textarea
            id="personality-textarea"
            bind:value={personalityValues}
            on:input={markAsChanged}
            placeholder={$t('step1.overview.personality_placeholder')}
            class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          ></textarea>
        </div>
      </div>
      <!-- Career Goals Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span class="text-2xl">🎯</span>
          </div>
          <h2 class="text-2xl font-semibold text-gray-800">{$t('step1.overview.goals_title')}</h2>
        </div>
        <div class="space-y-4">
          <div class="bg-purple-50 p-4 rounded-lg">
            <p class="text-purple-800 text-sm mb-2">💡 <strong>{$t('step1.overview.goals_explainer')}</strong></p>
            <ul class="text-purple-700 text-sm space-y-1">
              <li>• {$t('step1.overview.goals_bullet1')}</li>
              <li>• {$t('step1.overview.goals_bullet2')}</li>
              <li>• {$t('step1.overview.goals_bullet3')}</li>
            </ul>
          </div>
          <label for="goals-textarea" class="sr-only">{$t('step1.overview.goals_title')}</label>
          <textarea
            id="goals-textarea"
            bind:value={goals}
            on:input={markAsChanged}
            placeholder={$t('step1.overview.goals_placeholder')}
            class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            required
          ></textarea>
        </div>
      </div>
      <!-- Doubts & Barriers Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span class="text-2xl">🤔</span>
          </div>
          <h2 class="text-2xl font-semibold text-gray-800">{$t('step1.overview.doubts_title')}</h2>
        </div>
        <div class="space-y-4">
          <div class="bg-indigo-50 p-4 rounded-lg">
            <p class="text-indigo-800 text-sm mb-2">💡 <strong>{$t('step1.overview.doubts_explainer')}</strong></p>
            <ul class="text-indigo-700 text-sm space-y-1">
              <li>• {$t('step1.overview.doubts_bullet1')}</li>
              <li>• {$t('step1.overview.doubts_bullet2')}</li>
              <li>• {$t('step1.overview.doubts_bullet3')}</li>
            </ul>
          </div>
          <label for="doubts-textarea" class="sr-only">{$t('step1.overview.doubts_title')}</label>
          <textarea
            id="doubts-textarea"
            bind:value={doubtsBarriers}
            on:input={markAsChanged}
            placeholder={$t('step1.overview.doubts_placeholder')}
            class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
          ></textarea>
        </div>
      </div>
      <!-- Emotional Landscape Section -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="flex items-center space-x-3 mb-6">
          <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span class="text-2xl">💭</span>
          </div>
          <h2 class="text-2xl font-semibold text-gray-800">{$t('step1.overview.emotional_title')}</h2>
        </div>
        <div class="space-y-4">
          <div class="bg-indigo-50 p-4 rounded-lg">
            <p class="text-indigo-800 text-sm mb-2">💡 <strong>{$t('step1.overview.emotional_explainer')}</strong></p>
            <ul class="text-indigo-700 text-sm space-y-1">
              <li>• {$t('step1.overview.emotional_bullet1')}</li>
              <li>• {$t('step1.overview.emotional_bullet2')}</li>
              <li>• {$t('step1.overview.emotional_bullet3')}</li>
            </ul>
          </div>
          <label for="emotional-textarea" class="sr-only">{$t('step1.overview.emotional_title')}</label>
          <textarea
            id="emotional-textarea"
            bind:value={emotionalLandscape}
            on:input={markAsChanged}
            placeholder={$t('step1.overview.emotional_placeholder')}
            class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
          ></textarea>
        </div>
      </div>
      <!-- Navigation -->
      <div class="flex justify-between items-center pt-6">
        <button
          type="button"
          on:click={goToDashboard}
          class="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span>{$t('step1.overview.back_to_dashboard')}</span>
        </button>
        <button
          type="button"
          on:click={() => {
            if (fromOnboarding) {
              goto(`/questionnaire/${sessionId}/step2?from=onboarding`);
            } else {
              goto(`/questionnaire/${sessionId}/step2`);
            }
          }}
          class="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600 text-white font-semibold rounded-lg transition-colors shadow-lg"
        >
          <span>{$t('step1.overview.continue_to_step2')}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </form>
  </div>
</div> 