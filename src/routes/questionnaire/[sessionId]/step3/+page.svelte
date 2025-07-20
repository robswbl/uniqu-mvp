<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const sessionId = $page.params.sessionId;

	let ikigai_love = '';
	let ikigai_good_at = '';
	let ikigai_care_about = '';
	let ikigai_inspires = '';
	let ikigai_want_to_be = '';
	let saveStatus = 'Ready';
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
					ikigai_love,
					ikigai_good_at,
					ikigai_care_about,
					ikigai_inspires,
					ikigai_want_to_be
				})
				.eq('id', sessionId);

			if (error) {
				saveStatus = `Error: ${error.message}`;
			} else {
				saveStatus = `Saved at ${new Date().toLocaleTimeString()}`;
			}
		}, 1000);
	}

	async function proceedToStep3() {
		// Save current progress
		await saveProgress();
		// Navigate to dashboard or next step
		await goto(`/dashboard/${sessionId}`);
	}

	async function goBack() {
		await goto(`/questionnaire/${sessionId}/step2`);
	}

	function handleRegenerate(event: Event) {
		// Call the backend endpoint to trigger regeneration
		fetch(`/questionnaire/${sessionId}/step3/regenerate`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'regenerate' })
		})
			.then(() => goto(`/results/${sessionId}/generating`));
	}

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('ikigai_love, ikigai_good_at, ikigai_care_about, ikigai_inspires, ikigai_want_to_be')
			.eq('id', sessionId)
			.single();

		if (data) {
			ikigai_love = data.ikigai_love || '';
			ikigai_good_at = data.ikigai_good_at || '';
			ikigai_care_about = data.ikigai_care_about || '';
			ikigai_inspires = data.ikigai_inspires || '';
			ikigai_want_to_be = data.ikigai_want_to_be || '';
			saveStatus = 'Loaded existing data.';
		}

		// Auto-resize all textareas on load
		setTimeout(() => {
			const textareas = document.querySelectorAll('textarea');
			textareas.forEach(textarea => autogrow(textarea as HTMLTextAreaElement));
		}, 100);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
	<!-- Progress Bar -->
	<div class="bg-white shadow-sm">
		<div class="max-w-4xl mx-auto p-4">
			<div class="flex items-center justify-between text-sm text-gray-600 mb-2">
				<span>Step 3 of 3</span>
				<span class="text-xs bg-gray-100 px-2 py-1 rounded">{saveStatus}</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full w-full transition-all duration-300"></div>
			</div>
		</div>
	</div>

	<div class="max-w-4xl mx-auto">
		<div class="flex justify-between items-center mb-6">
			<button 
				on:click={() => goto(`/dashboard/${sessionId}`)}
				class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
				type="button"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
				</svg>
				<span>Back to Dashboard</span>
			</button>
		</div>
		<div class="text-center mb-8">
			<div class="flex items-center justify-center space-x-2 mb-4">
				<div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
				<div class="w-16 h-0.5 bg-gray-300"></div>
				<div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
				<div class="w-16 h-0.5 bg-gray-300"></div>
				<div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</div>
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2">Step 3: Discover Your Ikigai</h1>
			<p class="text-lg text-gray-600">These five questions will help us understand what drives you, what you're passionate about, and what gives your life meaning.</p>
		</div>
	</div>

	<div class="max-w-4xl mx-auto p-6 md:p-8">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
				</svg>
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
				Discover Your Ikigai
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				These five questions will help us understand what drives you, what you're passionate about, and what gives your life meaning.
			</p>
		</div>

		<!-- Ikigai Questions -->
		<div class="space-y-8">
			<!-- Question 1: What do you love? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-red-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">❤️</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">What do you love to do?</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('love')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['love'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['love']}
						<div class="p-4 bg-red-50 rounded-b-lg border-t border-red-200 space-y-3">
							<p class="text-gray-600 text-sm">You know those hobbies you just can't get enough of? The activities you look forward to all week? Think about what you're doing when you lose track of time, when the outside world seems to just fade away.</p>
							<p class="text-gray-500 text-xs italic">Examples: I enjoy cooking – planning meals, chopping ingredients... Building my own computer. Playing in hockey tournaments.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_love} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What activities make you feel truly alive and energized?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 2: What are you great at? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-blue-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">⭐</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">What are you great at?</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('good_at')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['good_at'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['good_at']}
						<div class="p-4 bg-blue-50 rounded-b-lg border-t border-blue-200 space-y-3">
							<p class="text-gray-600 text-sm">What activities flow naturally? What skills have you developed? When do people turn to you for help or advice? Think about tasks where you've been complimented or recognized.</p>
							<p class="text-gray-500 text-xs italic">Examples: People ask me for guidance on tech... I'm known for keeping houseplants healthy. Friends come to me for relationship advice.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_good_at} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What are your natural talents and developed skills?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 3: What do you care about? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-green-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🌍</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">What do you care about?</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('care')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['care'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['care']}
						<div class="p-4 bg-green-50 rounded-b-lg border-t border-green-200 space-y-3">
							<p class="text-gray-600 text-sm">What societal, environmental, or humanitarian issues ignite your passion? What problems do you see that you want to help fix?</p>
							<p class="text-gray-500 text-xs italic">Examples: Better access to education in developing countries. Building a circular economy. Diversity and inclusion.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_care_about} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What causes or issues deeply matter to you?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-400 focus:ring-green-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 4: What inspires you? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-orange-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🚀</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">What inspires you?</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('inspires')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['inspires'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['inspires']}
						<div class="p-4 bg-orange-50 rounded-b-lg border-t border-orange-200 space-y-3">
							<p class="text-gray-600 text-sm">Which industries or fields capture your imagination? What draws you to them - innovation, helping people, creativity, or something else?</p>
							<p class="text-gray-500 text-xs italic">Examples: Software because I like creating things people use. Animal welfare because I want to help them. Recruiting because I meet interesting people.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_inspires} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What industries or fields excite and motivate you?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-orange-400 focus:ring-orange-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 5: Who do you want to be? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-purple-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">✨</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">Who do you want to be?</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('want_to_be')}
					>
						<span>💡 Need inspiration?</span>
						<span class="text-gray-400">{expandedInstructions['want_to_be'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['want_to_be']}
						<div class="p-4 bg-purple-50 rounded-b-lg border-t border-purple-200 space-y-3">
							<p class="text-gray-600 text-sm">Think about your dreams and long-term aspirations. What legacy do you want to leave? What lifestyle do you dream of? What milestones are you striving to reach?</p>
							<p class="text-gray-500 text-xs italic">Examples: I want to spend more time with my kids. Write a book about scuba diving. Earn enough to retire comfortably at 55.</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_want_to_be} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder="What are your dreams and aspirations for the future?"
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-400 focus:ring-purple-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>
		</div>

		<!-- Navigation -->
		<div class="flex justify-between items-center mt-12">
			<button
				type="button"
				on:click={goBack}
				class="text-gray-600 hover:text-gray-800 font-medium flex items-center transition-colors duration-200"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
				Back to Step 2
			</button>

			<form method="POST" action="/questionnaire/{sessionId}/step3/regenerate" on:submit|preventDefault={handleRegenerate} class="w-full flex justify-end">
				<button
					type="submit"
					class="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
				>
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v4m0 0V4m0 4a4 4 0 100 8 4 4 0 100-8zm0 8v4m0 0v-4" />
					</svg>
					Regenerate
				</button>
			</form>
		</div>

		<!-- Warning Box below navigation -->
		<div class="flex justify-center mt-6">
			<div class="bg-orange-100 border-l-4 border-orange-400 text-orange-800 p-4 rounded-lg max-w-xl w-full text-center">
				<strong>Warning:</strong> Regenerating will overwrite your previous results. Are you sure you want to proceed?
			</div>
		</div>
	</div>
</div> 