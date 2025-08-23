<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';

	const sessionId = $page.params.sessionId;
	let ikigaiGoodAt = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = false;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_good_at')
			.eq('id', sessionId)
			.single();
		if (data) {
			ikigaiGoodAt = data.ikigai_good_at || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(saveIkigaiGoodAt, 600);
	}

	async function saveIkigaiGoodAt() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ ikigai_good_at: ikigaiGoodAt })
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
		goto(`/questionnaire/${sessionId}/ikigai/care_about`);
	}
	function goToBack() {
		goto(`/questionnaire/${sessionId}/ikigai/love`);
	}
</script>

<svelte:head>
	<title>Step 3: What are you great at? - Ikigai</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 3: Discover Your Ikigai"
	title="What are you great at?"
	emoji="⭐"
	explainer="💡 Need inspiration?"
	explainerColor="blue"
	textareaPlaceholder="What are your natural talents and developed skills?"
	bind:textareaValue={ikigaiGoodAt}
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
			class="text-sm text-blue-700 underline"
			on:click={() => (showInspiration = !showInspiration)}
		>
			{showInspiration ? 'Hide inspiration' : 'Show inspiration'}
		</button>
		{#if showInspiration}
			<div class="mt-2 space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
				<p class="text-sm text-gray-600">
					What activities flow naturally? What skills have you developed? When do people turn to you
					for help or advice? Think about tasks where you've been complimented or recognized.
				</p>
				<p class="text-xs text-gray-500 italic">
					Examples: People ask me for guidance on tech... I'm known for keeping houseplants healthy.
					Friends come to me for relationship advice.
				</p>
			</div>
		{/if}
	</div>
</QuestionCard>
