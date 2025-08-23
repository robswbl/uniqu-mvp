<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;

	let goals = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('goals')
			.eq('id', sessionId)
			.single();
		if (data) {
			goals = data.goals || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = $t('step1.goals.saving');
		saveTimeout = setTimeout(saveGoals, 600);
	}

	async function saveGoals() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ goals })
			.eq('id', sessionId);
		if (error) {
			saveStatus = $t('step1.goals.error_saving');
		} else {
			saveStatus = $t('step1.goals.saved');
		}
		isSaving = false;
		setTimeout(() => (saveStatus = ''), 1200);
	}

	async function goToNext() {
		// Save progress for resume
		await supabase
			.from('questionnaire_sessions')
			.update({ last_question_step: 'step1', last_question_id: 'personality_values' })
			.eq('id', sessionId);
		// Fetch the order from the DB
		const { data, error } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();

		if (data && data.order && Array.isArray(data.order)) {
			const order = data.order;
			const currentIndex = order.indexOf('goals');
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

	async function goToBack() {
		const { data } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();
		if (data && data.order && Array.isArray(data.order)) {
			const order = data.order;
			const currentIndex = order.indexOf('goals');
			const urlParams = get(page).url.searchParams;
			const fromOnboarding = urlParams.get('from') === 'onboarding';
			if (currentIndex > 0) {
				const prevQuestion = order[currentIndex - 1];
				const prevUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step1/${prevQuestion}?from=onboarding`
					: `/questionnaire/${sessionId}/step1/${prevQuestion}`;
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
	<title>{$t('step1.goals.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-4 text-2xl font-bold text-gray-800">{$t('step1.goals.step_heading')}</h1>
		<div class="mb-8 flex min-h-[500px] flex-col rounded-2xl bg-white p-8 shadow-xl">
			<!-- Save status top right -->
			{#if saveStatus}
				<span class="absolute top-4 right-4 text-sm text-gray-500">{saveStatus}</span>
			{/if}
			<div class="mb-6 flex items-center space-x-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
					<span class="text-2xl">🎯</span>
				</div>
				<h2 class="text-2xl font-semibold text-gray-800">{$t('step1.goals.title')}</h2>
			</div>
			<div class="flex-1 space-y-4">
				<div class="rounded-lg bg-purple-50 p-4">
					<p class="mb-2 text-sm text-purple-800">
						💡 <strong>{$t('step1.goals.explainer')}</strong>
					</p>
					<ul class="space-y-1 text-sm text-purple-700">
						<li>• {$t('step1.goals.bullet1')}</li>
						<li>• {$t('step1.goals.bullet2')}</li>
						<li>• {$t('step1.goals.bullet3')}</li>
					</ul>
				</div>
				<label for="goals-textarea" class="sr-only">{$t('step1.goals.title')}</label>
				<textarea
					id="goals-textarea"
					bind:value={goals}
					on:input={handleInput}
					placeholder={$t('step1.goals.textarea_placeholder')}
					class="h-32 w-full resize-none rounded-lg border border-gray-300 p-4 focus:border-transparent focus:ring-2 focus:ring-purple-500"
					required
				></textarea>
			</div>
			<div class="mt-8 flex justify-between">
				<button
					on:click={goToBack}
					class="rounded-lg bg-gray-200 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-300"
				>
					{$t('buttons.back')}
				</button>
				<button
					on:click={goToNext}
					class="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:from-indigo-700 hover:to-purple-600"
					disabled={isSaving}
				>
					{$t('buttons.next')}
				</button>
			</div>
		</div>
	</div>
</div>
