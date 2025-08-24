<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import QuestionCard from '$lib/QuestionCard.svelte';

	const sessionId = $page.params.sessionId;
	let ikigaiLove = '';
	let saveStatus = '';
	let isSaving = false;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let showInspiration = false;

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_love')
			.eq('id', sessionId)
			.single();
		if (data) {
			ikigaiLove = data.ikigai_love || '';
		}
	});

	function handleInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		isSaving = true;
		saveStatus = 'Saving...';
		saveTimeout = setTimeout(saveIkigaiLove, 600);
	}

	async function saveIkigaiLove() {
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ ikigai_love: ikigaiLove })
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
		goto(`/questionnaire/${sessionId}/compass/good_at`);
	}
	function goToBack() {
		goto(`/questionnaire/${sessionId}/cv`);
	}
</script>

<svelte:head>
	<title>Step 3: What do you love to do? - Your Compass</title>
</svelte:head>

<QuestionCard
	stepHeading="Step 3: Discover Your Compass"
	title="What do you love to do?"
	emoji="❤️"
	explainer="💡 Need inspiration?"
	explainerColor="red"
	textareaPlaceholder="What activities make you feel truly alive and energized?"
	bind:textareaValue={ikigaiLove}
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
			class="text-sm text-red-700 underline"
			on:click={() => (showInspiration = !showInspiration)}
		>
			{showInspiration ? 'Hide inspiration' : 'Show inspiration'}
		</button>
		{#if showInspiration}
			<div class="mt-2 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
				<p class="text-sm text-gray-600">
					You know those hobbies you just can't get enough of? The activities you look forward to
					all week? Think about what you're doing when you lose track of time, when the outside
					world seems to just fade away.
				</p>
				<p class="text-xs text-gray-500 italic">
					Examples: I enjoy cooking – planning meals, chopping ingredients... Building my own
					computer. Playing in hockey tournaments.
				</p>
			</div>
		{/if}
	</div>
</QuestionCard>
