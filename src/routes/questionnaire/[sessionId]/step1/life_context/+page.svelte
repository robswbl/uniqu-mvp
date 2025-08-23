<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;

	let lifeContext = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('life_context')
			.eq('id', sessionId)
			.single();
		if (data) {
			lifeContext = data.life_context || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = $t('step1.life_context.saving');
		saveTimeout = setTimeout(saveLifeContext, 600);
	}

	async function saveLifeContext() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ life_context: lifeContext })
			.eq('id', sessionId);
		if (error) {
			saveStatus = $t('step1.life_context.error_saving');
		} else {
			saveStatus = $t('step1.life_context.saved');
		}
		isSaving = false;
		setTimeout(() => (saveStatus = ''), 1200);
	}

	async function goToNext() {
		const { data, error } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();

		if (data && data.order && Array.isArray(data.order)) {
			const order = data.order;
			const currentIndex = order.indexOf('life_context');
			const urlParams = get(page).url.searchParams;
			const fromOnboarding = urlParams.get('from') === 'onboarding';
			if (currentIndex !== -1 && currentIndex < order.length - 1) {
				const nextQuestion = order[currentIndex + 1];
				const nextUrl = fromOnboarding
					? `/questionnaire/${sessionId}/step1/${nextQuestion}?from=onboarding`
					: `/questionnaire/${sessionId}/step1/${nextQuestion}`;
				goto(nextUrl);
			} else {
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
			const currentIndex = order.indexOf('life_context');
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
	<title>{$t('step1.life_context.title')} - {$t('app.title')}</title>
</svelte:head>

<QuestionCard
	stepHeading={$t('step1.life_context.step_heading')}
	title={$t('step1.life_context.title')}
	emoji="🌟"
	explainer={$t('step1.life_context.explainer')}
	explainerColor="green"
	explainerBullets={[
		$t('step1.life_context.bullet1'),
		$t('step1.life_context.bullet2'),
		$t('step1.life_context.bullet3')
	]}
	textareaPlaceholder={$t('step1.life_context.textarea_placeholder')}
	bind:textareaValue={lifeContext}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel={$t('buttons.next')}
	backLabel={$t('buttons.back')}
	disabled={isSaving}
/>
