<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;
	let ikigaiCareAbout = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	// Removed showInspiration - now using QuestionCard's built-in explainer

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_care_about')
			.eq('id', sessionId)
			.single();
		if (data) {
			ikigaiCareAbout = data.ikigai_care_about || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(saveIkigaiCareAbout, 600);
	}

	async function saveIkigaiCareAbout() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ ikigai_care_about: ikigaiCareAbout })
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
			const currentIndex = order.indexOf('care_about');
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
			const currentIndex = order.indexOf('care_about');
			const urlParams = get(page).url.searchParams;
			const fromOnboarding = urlParams.get('from') === 'onboarding';
			if (currentIndex > 0) {
				const prevQuestion = order[currentIndex - 1];
				const prevUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step3/${prevQuestion}?from=onboarding`
					: `/questionnaire/${sessionId}/step3/${prevQuestion}`;
				goto(prevUrl);
			} else if (currentIndex === 0) {
				// Go to step2 root (step2 is a single page, not multiple sub-pages)
				const prevUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step2?from=onboarding`
					: `/questionnaire/${sessionId}/step2`;
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
	<title>Step 3: What do you care about? - Your Compass</title>
</svelte:head>

<QuestionCard
	stepHeading={$t('step3.care_about.step_heading')}
	title={$t('step3.care_about.title')}
	emoji="🌍"
	explainer={$t('step3.care_about.inspiration_text')}
	explainerColor="green"
	explainerBullets={[$t('step3.care_about.inspiration_examples')]}
	textareaPlaceholder={$t('step3.care_about.textarea_placeholder')}
	bind:textareaValue={ikigaiCareAbout}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel={$t('buttons.next')}
	backLabel={$t('buttons.back')}
	disabled={isSaving}
/>
