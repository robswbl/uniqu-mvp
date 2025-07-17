<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const sessionId = $page.params.sessionId;

	let goals = '';
	let personality_values = '';
	let doubts_barriers = '';
	let life_context = '';
	let emotional_landscape = '';
	let core_summary = '';
	let saveStatus = 'Ready';
	let isSubmitting = false;
	let expandedInstructions: { [key: string]: boolean } = {};

	function toggleInstructions(key: string) {
		expandedInstructions[key] = !expandedInstructions[key];
	}

	function autogrow(element: HTMLTextAreaElement) {
		element.style.height = 'auto';
		const newHeight = Math.max(element.scrollHeight, 120);
		element.style.height = `${newHeight}px`;
	}

	let timeoutId: ReturnType<typeof setTimeout>;
	async function saveProgress() {
		saveStatus = 'Saving...';
		clearTimeout(timeoutId);
		timeoutId = setTimeout(async () => {
			const { error } = await supabase
				.from('questionnaire_sessions')
				.update({
					goals,
					personality_values,
					doubts_barriers,
					life_context,
					emotional_landscape,
					core_summary
				})
				.eq('id', sessionId);

			if (error) {
				saveStatus = `Error: ${error.message}`;
			} else {
				saveStatus = `Saved at ${new Date().toLocaleTimeString()}`;
			}
		}, 1000);
	}

	async function submitAndProcess() {
		isSubmitting = true;
		
		// Save current progress
		await saveProgress();
		
		// Update session status to completed
		const { error } = await supabase
			.from('questionnaire_sessions')
			.update({ 
				status: 'completed',
				completed_at: new Date().toISOString()
			})
			.eq('id', sessionId);

		if (error) {
			alert('Error submitting questionnaire: ' + error.message);
			isSubmitting = false;
			return;
		}

		// Navigate to results or processing page
		await goto(`/results/${sessionId}`);
	}

	async function goBack() {
		await goto(`/questionnaire/${sessionId}/ikigai`);
	}

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('goals, personality_values, doubts_barriers, life_context, emotional_landscape, core_summary')
			.eq('id', sessionId)
			.single();

		if (data) {
			goals = data.goals || '';
			personality_values = data.personality_values || '';
			doubts_barriers = data.doubts_barriers || '';
			life_context = data.life_context || '';
			emotional_landscape = data.emotional_landscape || '';
			core_summary = data.core_summary || '';
			saveStatus = 'Loaded existing data.';
		}

		// Auto-resize all textareas on load
		setTimeout(() => {
			const textareas = document.querySelectorAll('textarea');
			textareas.forEach(textarea => autogrow(textarea as HTMLTextAreaElement));
		}, 100);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
	<!-- Progress Bar -->
	<div class="bg-white shadow-sm">
		<div class="max-w-4xl mx-auto p-4">
			<div class="flex items-center justify-between text-sm text-gray-600 mb-2">
				<span>Step 3 of 3</span>
				<span class="text-xs bg-gray-100 px-2 py-1 rounded">{saveStatus}</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full w-full transition-all duration-300"></div>
			</div>
		</div>
	</div>

	<div class="max-w-4xl mx-auto p-6 md:p-8">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-6">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
				</svg>
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
				Complete Your Profile
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				Let's finish with some context about your current situation, goals, and what makes you uniquely you.
			</p>
		</div>

		<!-- Final Questions -->
		<div class="space-y-8">
			<!-- Goals -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-emerald-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🎯</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Goals</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-emerald-50 hover:bg-emerald-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('goals')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['goals'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['goals']}
						<div class="p-4 bg-emerald-50 rounded-b-lg border-t border-emerald-200">
							<p class="text-gray-600 text-sm">What are your desired outcomes for your career, workplace, and life balance?</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={goals} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="Describe your career goals, lifestyle aspirations, and what success looks like to you..."
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-emerald-400 focus:ring-emerald-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Personality & Values -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-blue-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🧠</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Personality & Values</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('personality')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['personality'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['personality']}
						<div class="p-4 bg-blue-50 rounded-b-lg border-t border-blue-200">
							<p class="text-gray-600 text-sm">Describe your personality, what you value in life, and what defines you as a person.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={personality_values} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What are your core values, personality traits, and what matters most to you in life?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Doubts & Barriers -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-amber-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🤔</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Doubts / Barriers</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-amber-50 hover:bg-amber-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('doubts')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['doubts'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['doubts']}
						<div class="p-4 bg-amber-50 rounded-b-lg border-t border-amber-200">
							<p class="text-gray-600 text-sm">What questions, doubts, or barriers are on your mind? What's holding you back?</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={doubts_barriers} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What concerns, obstacles, or uncertainties are you facing?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-amber-400 focus:ring-amber-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Current Life Context -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-purple-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">📍</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Current Life Context</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('life_context')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['life_context'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['life_context']}
						<div class="p-4 bg-purple-50 rounded-b-lg border-t border-purple-200">
							<p class="text-gray-600 text-sm">Describe your current situation. Are you looking for a change, facing a challenge, or exploring new opportunities?</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={life_context} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What's happening in your life right now? What brought you here?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-400 focus:ring-purple-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Core Summary -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-rose-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-rose-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">💎</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Core Summary</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-rose-50 hover:bg-rose-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('core_summary')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['core_summary'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['core_summary']}
						<div class="p-4 bg-rose-50 rounded-b-lg border-t border-rose-200">
							<p class="text-gray-600 text-sm">In a few bullet points, summarize your background, soul's yearning, biggest fear, and superpower.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={core_summary} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="• Background: ...\n• Soul's yearning: ...\n• Biggest fear: ...\n• Superpower: ..."
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-rose-400 focus:ring-rose-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex justify-between items-center mt-12">
			<button
				type="button"
				on:click={goBack}
				class="text-gray-600 hover:text-gray-800 font-medium flex items-center transition-colors duration-200"
				disabled={isSubmitting}
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
				Back to Ikigai
			</button>

			<button
				type="button"
				on:click={submitAndProcess}
				disabled={isSubmitting}
				class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center text-lg disabled:transform-none disabled:shadow-md"
			>
				{#if isSubmitting}
					<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Processing...
				{:else}
					🚀 Generate My Analysis
					<svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
					</svg>
				{/if}
			</button>
		</div>
	</div>
</div>

<style lang="postcss">
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
</style>