<script lang="ts">
  import { t } from 'svelte-i18n';
  export let stepHeading: string = '';
  export let title: string;
  export let emoji: string;
  export let explainer: string;
  export let explainerColor: string = 'blue';
  export let explainerBullets: string[] = [];
  export let textareaPlaceholder: string;
  export let textareaValue: string;
  export let saveStatus: string = '';
  export let onInput: (e: Event) => void;
  export let onNext: () => void;
  export let onBack: () => void;
  export let nextLabel: string = $t('buttons.next');
  export let backLabel: string = $t('buttons.back');
  export let disabled: boolean = false;
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
  <div class="max-w-2xl mx-auto">
    {#if stepHeading}
      <h1 class="text-2xl font-bold text-gray-800 mb-4">{stepHeading}</h1>
    {/if}
    <div class="bg-white rounded-2xl shadow-xl p-8 mb-8 flex flex-col min-h-[500px] relative">
      {#if saveStatus}
        <span class="absolute top-4 right-4 text-sm text-gray-500">{saveStatus}</span>
      {/if}
      <div class="flex items-center space-x-3 mb-6">
        <div class="w-10 h-10 bg-{explainerColor}-100 rounded-full flex items-center justify-center">
          <span class="text-2xl">{emoji}</span>
        </div>
        <h2 class="text-2xl font-semibold text-gray-800">{title}</h2>
      </div>
      <div class="space-y-4 flex-1">
        {#if explainer}
          <div class="bg-{explainerColor}-50 p-4 rounded-lg">
            <p class="text-{explainerColor}-800 text-sm mb-2">💡 <strong>{explainer}</strong></p>
            {#if explainerBullets.length}
              <ul class="text-{explainerColor}-700 text-sm space-y-1">
                {#each explainerBullets as bullet}
                  <li>• {bullet}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
        <textarea
          class="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-{explainerColor}-500 focus:border-transparent resize-none"
          placeholder={textareaPlaceholder}
          bind:value={textareaValue}
          on:input={onInput}
        ></textarea>
        <slot />
      </div>
      <div class="flex justify-between mt-8">
        {#if backLabel && onBack}
          <button on:click={onBack} class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors" type="button">
            {backLabel}
          </button>
        {:else}
          <span></span>
        {/if}
        {#if nextLabel && onNext}
          <button on:click={onNext} class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors" disabled={disabled} type="button">
            {nextLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Fallback for dynamic color classes */
  [class*='bg--100'] { background-color: #f0f4ff; }
  [class*='bg--50'] { background-color: #f8fafc; }
  [class*='text--800'] { color: #1e293b; }
  [class*='text--700'] { color: #334155; }
  [class*='focus\:ring--500'] { box-shadow: 0 0 0 2px #6366f1; }
</style> 