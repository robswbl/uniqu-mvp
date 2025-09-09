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
	// Removed showInspiration - now using QuestionCard's built-in explainer

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
		setTimeout(() => (saveStatus = ''), 1200);
	}

	async function goToNext() {
		const { data } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step3')
			.single();
		if (data && data.order && Array.isArray(data.order)) {
			const order = data.order;
			const currentIndex = order.indexOf('inspires');
			const urlParams = get(page).url.searchParams;
			const fromOnboarding = urlParams.get('from') === 'onboarding';
			if (currentIndex < order.length - 1) {
				const nextQuestion = order[currentIndex + 1];
				const nextUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step3/${nextQuestion}?from=onboarding`
					: `/questionnaire/${sessionId}/step3/${nextQuestion}`;
				goto(nextUrl);
			} else {
				// Last question, go to generate
				const nextUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step3/generate?from=onboarding`
					: `/questionnaire/${sessionId}/step3/generate`;
				goto(nextUrl);
			}
		}
	}
	async function goToBack() {
		const { data } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step3')
			.single();
		if (data && data.order && Array.isArray(data.order)) {
			const order = data.order;
			const currentIndex = order.indexOf('inspires');
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
	<title>{$t('step3.inspires.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
	stepHeading={$t('step3.inspires.step_heading')}
	title={$t('step3.inspires.title')}
	emoji="🚀"
	explainer={$t('step3.inspires.inspiration_text')}
	explainerColor="orange"
	explainerBullets={[$t('step3.inspires.inspiration_examples')]}
	textareaPlaceholder={$t('step3.inspires.textarea_placeholder')}
	bind:textareaValue={ikigaiInspires}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel={$t('buttons.next')}
	backLabel={$t('buttons.back')}
	disabled={isSaving}
/>
