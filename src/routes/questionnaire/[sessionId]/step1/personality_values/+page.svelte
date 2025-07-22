<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';
	import { get } from 'svelte/store';

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
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(savePersonality, 600);
	}

	async function savePersonality() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ personality_values: personalityValues })
			.eq('id', sessionId);
		if (error) {
			saveStatus = 'Error saving';
		} else {
			saveStatus = 'Saved ✓';
		}
		isSaving = false;
		setTimeout(() => saveStatus = '', 1200);
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

	function goToBack() {
		goto(`/onboarding/${sessionId}`);
	}
</script>

<svelte:head>
	<title>Step 1: Your Personality & Values - UniqU</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 1: Your Current Situation"
	title="Your Personality & Values"
	emoji="💎"
	explainer="Consider:"
	explainerColor="blue"
	explainerBullets={["How do you prefer to work? (independently, in teams, etc.)", "What values are most important to you?", "What kind of work environment brings out your best?"]}
	textareaPlaceholder="Tell us about your personality, work style, and core values..."
	bind:textareaValue={personalityValues}
	saveStatus={saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	nextLabel="Next"
	backLabel="Back"
	onBack={goToBack}
	disabled={isSaving}
/> 