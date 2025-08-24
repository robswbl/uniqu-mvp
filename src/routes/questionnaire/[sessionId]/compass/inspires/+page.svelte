<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';

	const sessionId = $page.params.sessionId;
	let ikigaiInspires = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = false;

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

	function goToNext() {
		goto(`/questionnaire/${sessionId}/compass/want_to_be`);
	}
	function goToBack() {
		goto(`/questionnaire/${sessionId}/compass/care_about`);
	}
</script>

<svelte:head>
	<title>Step 3: What inspires you? - Your Compass</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 3: Discover Your Compass"
	title="What inspires you?"
	emoji="✨"
	explainer="💡 Need inspiration?"
	explainerColor="purple"
	textareaPlaceholder="What industries, fields, or people inspire you?"
	bind:textareaValue={ikigaiInspires}
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
			class="text-sm text-purple-700 underline"
			on:click={() => (showInspiration = !showInspiration)}
		>
			{showInspiration ? 'Hide inspiration' : 'Show inspiration'}
		</button>
		{#if showInspiration}
			<div class="mt-2 space-y-3 rounded-lg border border-purple-200 bg-purple-50 p-4">
				<p class="text-sm text-gray-600">
					What industries, fields, or people inspire you? Think about what you admire in others or
					what you find fascinating.
				</p>
				<p class="text-xs text-gray-500 italic">
					Examples: Space exploration, social entrepreneurs, artists, scientists, activists.
				</p>
			</div>
		{/if}
	</div>
</QuestionCard>
