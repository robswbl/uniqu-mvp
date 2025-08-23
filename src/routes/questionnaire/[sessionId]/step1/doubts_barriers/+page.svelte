<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;

	let doubtsBarriers = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('doubts_barriers')
			.eq('id', sessionId)
			.single();
		if (data) {
			doubtsBarriers = data.doubts_barriers || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(saveDoubts, 600);
	}

	async function saveDoubts() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ doubts_barriers: doubtsBarriers })
			.eq('id', sessionId);
		if (error) {
			saveStatus = 'Error saving';
		} else {
			saveStatus = 'Saved ✓';
		}
		isSaving = false;
		setTimeout(() => (saveStatus = ''), 1200);
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
			const currentIndex = order.indexOf('doubts_barriers');
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
			const currentIndex = order.indexOf('doubts_barriers');
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
	<title>{$t('step1.doubts_barriers.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
	title={$t('step1.doubts_barriers.title')}
	emoji="🤔"
	explainer={$t('step1.doubts_barriers.explainer')}
	explainerColor="indigo"
	textareaPlaceholder={$t('step1.doubts_barriers.textarea_placeholder')}
	bind:textareaValue={doubtsBarriers}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel={$t('buttons.next')}
	backLabel={$t('buttons.back')}
	disabled={isSaving}
/>
