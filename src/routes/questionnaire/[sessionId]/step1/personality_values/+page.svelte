<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;

	let personalityValues = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('personality_values')
			.eq('id', sessionId)
			.single();
		if (data) {
			personalityValues = data.personality_values || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = $t('step1.personality_values.saving');
		saveTimeout = setTimeout(savePersonalityValues, 600);
	}

	async function savePersonalityValues() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ personality_values: personalityValues })
			.eq('id', sessionId);
		if (error) {
			saveStatus = $t('step1.personality_values.error_saving');
		} else {
			saveStatus = $t('step1.personality_values.saved');
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
			const currentIndex = order.indexOf('personality_values');
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
			const currentIndex = order.indexOf('personality_values');
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
	<title>{$t('step1.personality_values.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
	stepHeading={$t('step1.personality_values.step_heading')}
	title={$t('step1.personality_values.title')}
	emoji="💎"
	explainer={$t('step1.personality_values.explainer')}
	explainerColor="blue"
	explainerBullets={[
		$t('step1.personality_values.bullet1'),
		$t('step1.personality_values.bullet2'),
		$t('step1.personality_values.bullet3')
	]}
	textareaPlaceholder={$t('step1.personality_values.textarea_placeholder')}
	bind:textareaValue={personalityValues}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	nextLabel={$t('buttons.next')}
	backLabel={$t('buttons.back')}
	onBack={goToBack}
	disabled={isSaving}
/>
