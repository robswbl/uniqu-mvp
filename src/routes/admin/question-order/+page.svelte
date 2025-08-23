<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	// Default questions for each step (used if DB is missing data)
	const defaultSteps = [
		{
			id: 'step1',
			name: 'Step 1: Your Current Situation',
			questions: [
				{ id: 'goals', label: 'Your Career Goals' },
				{ id: 'personality_values', label: 'Your Personality & Values' },
				{ id: 'life_context', label: 'Your Life Context' },
				{ id: 'doubts_barriers', label: 'Doubts & Barriers' },
				{ id: 'emotional_landscape', label: 'Emotional Landscape' }
			]
		},
		{
			id: 'step2',
			name: 'Step 2: Your CV',
			questions: [
				{ id: 'work_experience', label: 'Work Experience' },
				{ id: 'education', label: 'Education' }
			]
		},
		{
			id: 'step3',
			name: 'Step 3: Ikigai',
			questions: [
				{ id: 'ikigai_intro', label: 'Ikigai Introduction' },
				{ id: 'ikigai_questions', label: 'Ikigai Questions' }
			]
		}
	];

	let steps = JSON.parse(JSON.stringify(defaultSteps)); // Deep copy
	let loading = true;
	let error = '';

	// Helper: get question object by id for a step
	function getQuestionById(stepId: string, qid: string) {
		const step = defaultSteps.find((s) => s.id === stepId);
		return step?.questions.find((qq) => qq.id === qid);
	}

	onMount(async () => {
		loading = true;
		error = '';
		try {
			const { data, error: dbError } = await supabase.from('question_order').select('*');

			if (dbError) throw new Error(`DB Error: ${dbError.message}`);

			if (data && data.length) {
				// For each step, use the order from DB if available
				steps = defaultSteps.map((step) => {
					const dbRow = data.find(
						(row: { step_id: string; order: string[] }) => row.step_id === step.id
					);
					if (dbRow) {
						// Map question IDs from DB to question objects
						const orderedQuestions = dbRow.order
							.map((qid: string) => getQuestionById(step.id, qid))
							.filter(
								(
									q: { id: string; label: string } | undefined
								): q is { id: string; label: string } => Boolean(q)
							);
						return { ...step, questions: orderedQuestions };
					}
					return step;
				});
			}
		} catch (e: unknown) {
			error = `Failed to load question order: ${(e as Error)?.message || String(e)}`;
		} finally {
			loading = false;
		}
	});

	// Drag-and-drop state
	let draggingStepIdx: number | null = null;
	let draggingQuestionIdx: number | null = null;

	function onDragStart(stepIdx: number, questionIdx: number) {
		draggingStepIdx = stepIdx;
		draggingQuestionIdx = questionIdx;
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function onDrop(stepIdx: number, targetIdx: number) {
		if (draggingStepIdx === stepIdx && draggingQuestionIdx !== null) {
			const questions = steps[stepIdx].questions;
			const [moved] = questions.splice(draggingQuestionIdx, 1);
			questions.splice(targetIdx, 0, moved);
			steps = [...steps];
		}
		draggingStepIdx = null;
		draggingQuestionIdx = null;
	}

	async function saveOrder() {
		loading = true;
		error = '';
		try {
			for (const step of steps) {
				const order: string[] = step.questions.map((q: { id: string; label: string }) => q.id);
				console.log(`Attempting upsert for ${step.id}:`, { step_id: step.id, order });

				const { data, error: upsertError } = await supabase
					.from('question_order')
					.upsert({ step_id: step.id, order }, { onConflict: 'step_id' });

				if (upsertError) {
					console.error(`Upsert error for ${step.id}:`, upsertError);
					console.error('Error details:', {
						message: upsertError.message,
						details: upsertError.details,
						hint: upsertError.hint,
						code: upsertError.code
					});
					throw upsertError;
				}
				console.log(`Successfully saved ${step.id}:`, data);
			}
			alert('Order saved successfully!');
		} catch (e: unknown) {
			console.error('Save error details:', e);
			error = `Failed to save order: ${(e as Error)?.message || String(e)}`;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Admin: Question Order</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-8 text-3xl font-bold">Admin: Question Order</h1>

		{#if loading}
			<div class="mb-8 text-lg text-gray-500">Loading...</div>
		{:else if error}
			<div class="mb-8 text-lg text-red-600">{error}</div>
		{:else}
			{#each steps as step, stepIdx}
				<div class="mb-8 rounded-xl bg-white p-6 shadow">
					<h2 class="mb-4 text-xl font-semibold">{step.name}</h2>
					<ul>
						{#each step.questions as question, questionIdx}
							<li
								class="mb-2 cursor-move rounded bg-gray-100 p-3 {draggingStepIdx === stepIdx &&
								draggingQuestionIdx === questionIdx
									? 'opacity-50 ring-2 ring-indigo-400'
									: ''}"
								draggable="true"
								on:dragstart={() => onDragStart(stepIdx, questionIdx)}
								on:dragover={onDragOver}
								on:drop={() => onDrop(stepIdx, questionIdx)}
							>
								{question.label}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
			<button
				class="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
				on:click={saveOrder}
				disabled={loading}
			>
				Save Order
			</button>
		{/if}
	</div>
</div>
