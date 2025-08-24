<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';

	const sessionId = $page.params.sessionId;
	let ikigaiWantToBe = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = false;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_want_to_be')
			.eq('id', sessionId)
			.single();
		if (data) {
			ikigaiWantToBe = data.ikigai_want_to_be || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(saveIkigaiWantToBe, 600);
	}

	async function saveIkigaiWantToBe() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ ikigai_want_to_be: ikigaiWantToBe })
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
		goto(`/questionnaire/${sessionId}/final`);
	}
	function goToBack() {
		goto(`/questionnaire/${sessionId}/compass/inspires`);
	}
</script>

<svelte:head>
	<title>Step 3: Who do you want to become? - Your Compass</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 3: Discover Your Compass"
	title="Who do you want to become?"
	emoji="🎯"
	explainer="💡 Need inspiration?"
	explainerColor="orange"
	textareaPlaceholder="Who do you want to become? What impact do you want to have?"
	bind:textareaValue={ikigaiWantToBe}
	{saveStatus}
	onInput={handleInput}
	onNext={goToNext}
	onBack={goToBack}
	nextLabel="Finish"
	backLabel="Back"
	disabled={isSaving}
>
	<div class="mb-4">
		<button
			type="button"
			class="text-sm text-orange-700 underline"
			on:click={() => (showInspiration = !showInspiration)}
		>
			{showInspiration ? 'Hide inspiration' : 'Show inspiration'}
		</button>
		{#if showInspiration}
			<div class="mt-2 space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
				<p class="text-sm text-gray-600">
					Think about the qualities you admire in others, the legacy you want to leave, or the kind
					of impact you hope to have on your community or the world.
				</p>
				<p class="text-xs text-gray-500 italic">
					Examples: I want to be known as someone who lifts others up. I hope to inspire my children
					to follow their dreams. I want to be a leader who brings out the best in my team.
				</p>
			</div>
		{/if}
	</div>
</QuestionCard>
