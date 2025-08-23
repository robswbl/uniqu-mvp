<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';

	const sessionId = $page.params.sessionId;
	let ikigaiCareAbout = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = false;

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

	function goToNext() {
		goto(`/questionnaire/${sessionId}/ikigai/inspires`);
	}
	function goToBack() {
		goto(`/questionnaire/${sessionId}/ikigai/good_at`);
	}
</script>

<svelte:head>
	<title>Step 3: What do you care about? - Ikigai</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 3: Discover Your Ikigai"
	title="What do you care about?"
	emoji="🌍"
	explainer="💡 Need inspiration?"
	explainerColor="green"
	textareaPlaceholder="What causes or issues deeply matter to you?"
	bind:textareaValue={ikigaiCareAbout}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel="Next"
	backLabel="Back"
	disabled={isSaving}
>
	<div class="mb-4">
		<button
			type="button"
			class="text-sm text-green-700 underline"
			on:click={() => (showInspiration = !showInspiration)}
		>
			{showInspiration ? 'Hide inspiration' : 'Show inspiration'}
		</button>
		{#if showInspiration}
			<div class="mt-2 space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
				<p class="text-sm text-gray-600">
					What societal, environmental, or humanitarian issues ignite your passion? What problems do
					you see that you want to help fix?
				</p>
				<p class="text-xs text-gray-500 italic">
					Examples: Better access to education in developing countries. Building a circular economy.
					Diversity and inclusion.
				</p>
			</div>
		{/if}
	</div>
</QuestionCard>
