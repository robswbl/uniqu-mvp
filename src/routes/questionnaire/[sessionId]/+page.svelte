<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	const sessionId = $page.params.sessionId;
	let hasExistingData = false;

	async function startQuestionnaire() {
		await goto(`/questionnaire/${sessionId}/cv`);
	}

	onMount(async () => {
		// Check if user has any existing data
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('cv_text, ikigai_love, goals')
			.eq('id', sessionId)
			.single();

		if (data && (data.cv_text || data.ikigai_love || data.goals)) {
			hasExistingData = true;
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
	<div class="max-w-4xl mx-auto p-6 md:p-8 flex items-center min-h-screen">
		<div class="w-full">
			<!-- Header -->
			<div class="text-center mb-16">
				<div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-8">
					<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
					</svg>
				</div>
				<h1 class="text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">
					Welcome to Your UniqU Journey
				</h1>
				<p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
					Discover your unique path through a thoughtful exploration of your experiences, passions, and aspirations. We'll guide you through three focused steps to create your personalized career insights.
				</p>
			</div>

			<!-- Process Overview -->
			<div class="grid md:grid-cols-3 gap-8 mb-16">
				<!-- Step 1 -->
				<div class="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-blue-400">
					<div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
						</svg>
					</div>
					<h3 class="text-2xl font-bold text-gray-800 mb-4">Step 1: Your Story</h3>
					<p class="text-gray-600">Share your professional background and experience through your CV or resume.</p>
					<div class="mt-4 text-sm text-blue-600 font-medium">~5 minutes</div>
				</div>

				<!-- Step 2 -->
				<div class="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-purple-400">
					<div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
						</svg>
					</div>
					<h3 class="text-2xl font-bold text-gray-800 mb-4">Step 2: Your Ikigai</h3>
					<p class="text-gray-600">Explore what you love, what you're great at, what you care about, and your dreams.</p>
					<div class="mt-4 text-sm text-purple-600 font-medium">~10 minutes</div>
				</div>

				<!-- Step 3 -->
				<div class="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-emerald-400">
					<div class="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
						<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 003.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
						</svg>
					</div>
					<h3 class="text-2xl font-bold text-gray-800 mb-4">Step 3: Your Context</h3>
					<p class="text-gray-600">Complete your profile with goals, values, and current life situation.</p>
					<div class="mt-4 text-sm text-emerald-600 font-medium">~8 minutes</div>
				</div>
			</div>

			<!-- Features -->
			<div class="bg-white rounded-2xl shadow-lg p-8 mb-12">
				<h2 class="text-2xl font-bold text-gray-800 text-center mb-8">What You'll Get</h2>
				<div class="grid md:grid-cols-2 gap-8">
					<div class="flex items-start">
						<div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</div>
						<div>
							<h3 class="font-bold text-gray-800 mb-2">Personalized Reflection Letter</h3>
							<p class="text-gray-600">A thoughtful analysis of your unique journey and potential.</p>
						</div>
					</div>
					<div class="flex items-start">
						<div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</div>
						<div>
							<h3 class="font-bold text-gray-800 mb-2">Career Themes & Job Roles</h3>
							<p class="text-gray-600">Concrete career directions that align with your strengths.</p>
						</div>
					</div>
					<div class="flex items-start">
						<div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</div>
						<div>
							<h3 class="font-bold text-gray-800 mb-2">Ideal Companies List</h3>
							<p class="text-gray-600">Organizations that match your values and aspirations.</p>
						</div>
					</div>
					<div class="flex items-start">
						<div class="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mr-4 mt-1">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</div>
						<div>
							<h3 class="font-bold text-gray-800 mb-2">Auto-Save Progress</h3>
							<p class="text-gray-600">Your responses are saved automatically as you go.</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Start Button -->
			<div class="text-center">
				{#if hasExistingData}
					<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
						<p class="text-amber-800 text-sm">✨ We found some saved progress. You can continue where you left off!</p>
					</div>
				{/if}
				
				<button
					type="button"
					on:click={startQuestionnaire}
					class="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-4 px-12 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xl"
				>
					{hasExistingData ? 'Continue Your Journey' : 'Begin Your Journey'}
					<svg class="w-6 h-6 ml-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
					</svg>
				</button>
				
				<p class="text-gray-500 text-sm mt-4">Total time: ~20-25 minutes</p>
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
</style>