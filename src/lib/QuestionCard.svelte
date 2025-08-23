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
	<div class="mx-auto max-w-2xl">
		{#if stepHeading}
			<h1 class="mb-4 text-2xl font-bold text-gray-800">{stepHeading}</h1>
		{/if}
		<div class="relative mb-8 flex min-h-[500px] flex-col rounded-2xl bg-white p-8 shadow-xl">
			{#if saveStatus}
				<span class="absolute top-4 right-4 text-sm text-gray-500">{saveStatus}</span>
			{/if}
			<div class="mb-6 flex items-center space-x-3">
				<div
					class="h-10 w-10 bg-{explainerColor}-100 flex items-center justify-center rounded-full"
				>
					<span class="text-2xl">{emoji}</span>
				</div>
				<h2 class="text-2xl font-semibold text-gray-800">{title}</h2>
			</div>
			<div class="flex-1 space-y-4">
				{#if explainer}
					<div class="bg-{explainerColor}-50 rounded-lg p-4">
						<p class="text-{explainerColor}-800 mb-2 text-sm">💡 <strong>{explainer}</strong></p>
						{#if explainerBullets.length}
							<ul class="text-{explainerColor}-700 space-y-1 text-sm">
								{#each explainerBullets as bullet}
									<li>• {bullet}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
				<textarea
					class="h-64 w-full rounded-lg border border-gray-300 p-4 focus:ring-2 focus:ring-{explainerColor}-500 resize-none focus:border-transparent"
					placeholder={textareaPlaceholder}
					bind:value={textareaValue}
					on:input={onInput}
				></textarea>
				<slot />
			</div>
			<div class="mt-8 flex justify-between">
				{#if backLabel && onBack}
					<button
						on:click={onBack}
						class="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
						type="button"
					>
						{backLabel}
					</button>
				{:else}
					<span></span>
				{/if}
				{#if nextLabel && onNext}
					<button
						on:click={onNext}
						class="rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
						{disabled}
						type="button"
					>
						{nextLabel}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* Fallback for dynamic color classes */
	[class*='bg--100'] {
		background-color: #f0f4ff;
	}
	[class*='bg--50'] {
		background-color: #f8fafc;
	}
	[class*='text--800'] {
		color: #1e293b;
	}
	[class*='text--700'] {
		color: #334155;
	}
	[class*='focus\:ring--500'] {
		box-shadow: 0 0 0 2px #6366f1;
	}
</style>
