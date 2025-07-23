<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';

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
		
		// Navigate to step 3
		await goto(`/questionnaire/${sessionId}/final`);
	}

	async function goBack() {
		await goto(`/questionnaire/${sessionId}/cv`);
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
				<span>{$t('ikigai.progress')}</span>
				<span class="text-xs bg-gray-100 px-2 py-1 rounded">{saveStatus}</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full w-2/3 transition-all duration-300"></div>
			</div>
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
				{$t('ikigai.heading')}
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				{$t('ikigai.intro')}
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
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.love_title')}</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-red-50 hover:bg-red-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('love')}
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<span class="text-gray-400">{expandedInstructions['love'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['love']}
						<div class="p-4 bg-red-50 rounded-b-lg border-t border-red-200 space-y-3">
							<p class="text-gray-600 text-sm">{$t('ikigai.love_inspiration')}</p>
							<p class="text-gray-500 text-xs italic">{$t('ikigai.love_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_love} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder={$t('ikigai.love_placeholder')}
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-red-400 focus:ring-red-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 2: What are you great at? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-blue-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">⭐</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.good_at_title')}</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('good_at')}
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<span class="text-gray-400">{expandedInstructions['good_at'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['good_at']}
						<div class="p-4 bg-blue-50 rounded-b-lg border-t border-blue-200 space-y-3">
							<p class="text-gray-600 text-sm">{$t('ikigai.good_at_inspiration')}</p>
							<p class="text-gray-500 text-xs italic">{$t('ikigai.good_at_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_good_at} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder={$t('ikigai.good_at_placeholder')}
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-400 focus:ring-blue-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 3: What do you care about? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-green-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🌍</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.care_about_title')}</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('care')}
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<span class="text-gray-400">{expandedInstructions['care'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['care']}
						<div class="p-4 bg-green-50 rounded-b-lg border-t border-green-200 space-y-3">
							<p class="text-gray-600 text-sm">{$t('ikigai.care_about_inspiration')}</p>
							<p class="text-gray-500 text-xs italic">{$t('ikigai.care_about_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_care_about} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder={$t('ikigai.care_about_placeholder')}
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-green-400 focus:ring-green-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 4: What inspires you? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-orange-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">🚀</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.inspires_title')}</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('inspires')}
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<span class="text-gray-400">{expandedInstructions['inspires'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['inspires']}
						<div class="p-4 bg-orange-50 rounded-b-lg border-t border-orange-200 space-y-3">
							<p class="text-gray-600 text-sm">{$t('ikigai.inspires_inspiration')}</p>
							<p class="text-gray-500 text-xs italic">{$t('ikigai.inspires_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_inspires} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder={$t('ikigai.inspires_placeholder')}
					class="w-full rounded-xl border-gray-300 shadow-sm focus:border-orange-400 focus:ring-orange-400 resize-none overflow-hidden min-h-[120px] p-4"
				></textarea>
			</div>

			<!-- Question 5: Who do you want to be? -->
			<div class="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-purple-400">
				<div class="flex items-center mb-6">
					<div class="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-4">
						<span class="text-white font-bold text-lg">✨</span>
					</div>
					<h2 class="text-2xl font-bold text-gray-800">{$t('ikigai.want_to_be_title')}</h2>
				</div>
				
				<div class="border border-gray-200 rounded-lg mb-4">
					<button
						type="button"
						class="w-full p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-t-lg flex justify-between items-center text-sm font-medium text-gray-700"
						on:click={() => toggleInstructions('want_to_be')}
					>
						<span>{$t('ikigai.need_inspiration')}</span>
						<span class="text-gray-400">{expandedInstructions['want_to_be'] ? '−' : '+'}</span>
					</button>
					{#if expandedInstructions['want_to_be']}
						<div class="p-4 bg-purple-50 rounded-b-lg border-t border-purple-200 space-y-3">
							<p class="text-gray-600 text-sm">{$t('ikigai.want_to_be_inspiration')}</p>
							<p class="text-gray-500 text-xs italic">{$t('ikigai.want_to_be_examples')}</p>
						</div>
					{/if}
				</div>

				<textarea 
					bind:value={ikigai_want_to_be} 
					on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
					rows="4" 
					placeholder={$t('ikigai.want_to_be_placeholder')}
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
				{$t('ikigai.back_to_cv')}
			</button>

			<button
				type="button"
				on:click={proceedToStep3}
				class="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
			>
				{$t('ikigai.continue_to_final')}
				<svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</button>
		</div>
	</div>
</div>