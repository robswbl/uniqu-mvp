<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount, afterUpdate } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
  
	const sessionId = $page.params.sessionId;
	
	let goals = '';
	let personalityValues = '';
	let lifeContext = '';
	let doubtsBarriers = '';
	let emotionalLandscape = '';
	let coreSummary = '';
	
	let saveStatus = '';
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let isSubmitting = false;
	let hasUnsavedChanges = false;
  
	onMount(async () => {
	  // Load existing data
	  const { data, error } = await supabase
		.from('questionnaire_sessions')
		.select('goals, personality_values, life_context, doubts_barriers, emotional_landscape, core_summary')
		.eq('id', sessionId)
		.single();
  
	  if (data) {
		goals = data.goals || '';
		personalityValues = data.personality_values || '';
		lifeContext = data.life_context || '';
		doubtsBarriers = data.doubts_barriers || '';
		emotionalLandscape = data.emotional_landscape || '';
		coreSummary = data.core_summary || '';
	  }
	});
  
	function markAsChanged() {
	  hasUnsavedChanges = true;
	  saveProgress();
	}
  
	async function saveProgress() {
	  saveStatus = 'Saving...';
	  if (timeoutId) clearTimeout(timeoutId);
	  timeoutId = setTimeout(async () => {
		const { error } = await supabase
		  .from('questionnaire_sessions')
		  .update({
			status: 'in-progress',
			goals,
			personality_values: personalityValues,
			life_context: lifeContext,
			doubts_barriers: doubtsBarriers,
			emotional_landscape: emotionalLandscape,
			core_summary: coreSummary
		  })
		  .eq('id', sessionId);
  
		if (error) {
		  saveStatus = 'Error saving';
		  setTimeout(() => saveStatus = '', 3000);
		} else {
		  saveStatus = 'Saved ✓';
		  hasUnsavedChanges = false;
		  setTimeout(() => saveStatus = '', 2000);
		}
	  }, 1000);
	}
  
	function goToDashboard() {
	  goto(`/dashboard/${sessionId}`);
	}
  
	function goToIkigai() {
	  goto(`/questionnaire/${sessionId}/ikigai`);
	}
  
	const handleSubmit: SubmitFunction = () => {
	  isSubmitting = true;
	  return async ({ result }) => {
		if (result.type === 'redirect') {
		  await goto(result.location);
		}
		isSubmitting = false;
	  };
	}
  </script>
  
  <svelte:head>
	<title>Final Step - Goals & Context - UniqU</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
	<div class="max-w-4xl mx-auto">
	  
	  <!-- Header Navigation -->
	  <div class="flex justify-between items-center mb-6">
		<button 
		  on:click={goToDashboard}
		  class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
		  type="button"
		>
		  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
		  </svg>
		  <span>Back to Dashboard</span>
		</button>
		
		<div class="flex items-center space-x-4">
		  {#if hasUnsavedChanges}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center space-x-2">
			  <svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
			  </svg>
			  <span class="text-yellow-800 text-sm">Unsaved changes</span>
			</div>
		  {/if}
		  
		  {#if saveStatus}
			<div class="text-sm px-3 py-1 rounded"
				 class:text-green-600={saveStatus.includes('✓')}
				 class:text-blue-600={saveStatus.includes('Saving')}
				 class:text-red-600={saveStatus.includes('Error')}>
			  {saveStatus}
			</div>
		  {/if}
		</div>
	  </div>
  
	  <!-- Progress Header -->
	  <div class="text-center mb-8">
		<div class="flex items-center justify-center space-x-2 mb-4">
		  <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">✓</div>
		  <div class="w-16 h-0.5 bg-green-500"></div>
		  <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">✓</div>
		  <div class="w-16 h-0.5 bg-green-500"></div>
		  <div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</div>
		</div>
		<h1 class="text-3xl font-bold text-gray-800 mb-2">Final Step: Your Goals & Context</h1>
		<p class="text-lg text-gray-600">Tell us about your aspirations and personal context to complete your profile</p>
	  </div>
  
	  <form method="POST" use:enhance={handleSubmit} class="space-y-8">
		<!-- Goals Section -->
		<div class="bg-white rounded-2xl shadow-xl p-8">
		  <div class="flex items-center space-x-3 mb-6">
			<div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
			  <span class="text-2xl">🎯</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800">Your Career Goals</h2>
		  </div>
		  
		  <div class="space-y-4">
			<div class="bg-purple-50 p-4 rounded-lg">
			  <p class="text-purple-800 text-sm mb-2">💡 <strong>Helpful prompts:</strong></p>
			  <ul class="text-purple-700 text-sm space-y-1">
				<li>• What kind of role or industry excites you?</li>
				<li>• What impact do you want to have in your career?</li>
				<li>• Any specific companies or work environments you're drawn to?</li>
			  </ul>
			</div>
			
			<label for="goals-textarea" class="sr-only">Career Goals</label>
			<textarea
			  id="goals-textarea"
			  bind:value={goals}
			  on:input={markAsChanged}
			  placeholder="Describe your career goals and aspirations..."
			  class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
			  required
			></textarea>
		  </div>
		</div>
  
		<!-- Personality & Values Section -->
		<div class="bg-white rounded-2xl shadow-xl p-8">
		  <div class="flex items-center space-x-3 mb-6">
			<div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
			  <span class="text-2xl">💎</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800">Your Personality & Values</h2>
		  </div>
		  
		  <div class="space-y-4">
			<div class="bg-blue-50 p-4 rounded-lg">
			  <p class="text-blue-800 text-sm mb-2">💡 <strong>Consider:</strong></p>
			  <ul class="text-blue-700 text-sm space-y-1">
				<li>• How do you prefer to work? (independently, in teams, etc.)</li>
				<li>• What values are most important to you?</li>
				<li>• What kind of work environment brings out your best?</li>
			  </ul>
			</div>
			
			<label for="personality-textarea" class="sr-only">Personality and Values</label>
			<textarea
			  id="personality-textarea"
			  bind:value={personalityValues}
			  on:input={markAsChanged}
			  placeholder="Tell us about your personality, work style, and core values..."
			  class="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
			  required
			></textarea>
		  </div>
		</div>
  
		<!-- Life Context Section -->
		<div class="bg-white rounded-2xl shadow-xl p-8">
		  <div class="flex items-center space-x-3 mb-6">
			<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
			  <span class="text-2xl">🌟</span>
			</div>
			<h2 class="text-2xl font-semibold text-gray-800">Your Life Context</h2>
		  </div>
		  
		  <div class="space-y-4">
			<div class="bg-green-50 p-4 rounded-lg">
			  <p class="text-green-800 text-sm mb-2">💡 <strong>Share any relevant context:</strong></p>
			  <ul class="text-green-700 text-sm space-y-1">
				<li>• Current life stage and priorities</li>
				<li>• Geographic preferences or constraints</li>
				<li>• Family considerations or other commitments</li>
			  </ul>
			</div>
			
			<label for="life-context-textarea" class="sr-only">Life Context</label>
			<textarea
			  id="life-context-textarea"
			  bind:value={lifeContext}
			  on:input={markAsChanged}
			  placeholder="Tell us about your current life situation and any important context..."
			  class="w-full h-28 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
			></textarea>
		  </div>
		</div>
  
		<!-- Optional Advanced Sections -->
		<div class="bg-white rounded-2xl shadow-xl p-8">
		  <h3 class="text-xl font-semibold text-gray-800 mb-6">Additional Insights (Optional)</h3>
		  
		  <div class="space-y-6">
			<!-- Doubts & Barriers -->
			<div>
			  <label for="doubts-textarea" class="block text-sm font-medium text-gray-700 mb-2">
				<span class="text-lg">🤔</span> Any doubts or barriers you're facing?
			  </label>
			  <textarea
				id="doubts-textarea"
				bind:value={doubtsBarriers}
				on:input={markAsChanged}
				placeholder="What concerns or obstacles are you thinking about regarding your career path?"
				class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
			  ></textarea>
			</div>
  
			<!-- Emotional Landscape -->
			<div>
			  <label for="emotional-textarea" class="block text-sm font-medium text-gray-700 mb-2">
				<span class="text-lg">💭</span> How are you feeling about your career journey?
			  </label>
			  <textarea
				id="emotional-textarea"
				bind:value={emotionalLandscape}
				on:input={markAsChanged}
				placeholder="Excited, uncertain, ready for change? Share your current emotional state..."
				class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
			  ></textarea>
			</div>
  
			<!-- Core Summary -->
			<div>
			  <label for="summary-textarea" class="block text-sm font-medium text-gray-700 mb-2">
				<span class="text-lg">📝</span> Core Summary
			  </label>
			  <textarea
				id="summary-textarea"
				bind:value={coreSummary}
				on:input={markAsChanged}
				placeholder="In a few sentences, what's the essence of what you're looking for in your next career step?"
				class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
			  ></textarea>
			</div>
		  </div>
		</div>
  
		<!-- Navigation -->
		<div class="flex justify-between items-center pt-6">
		  <button
			type="button"
			on:click={goToIkigai}
			class="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
		  >
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
			</svg>
			<span>Back to Ikigai</span>
		  </button>
  
		  <button
			type="submit"
			disabled={isSubmitting}
			class="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
		  >
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
			</svg>
			<span>
			  {#if isSubmitting}
				Regenerating Your Analysis...
			  {:else}
				Regenerate My Analysis
			  {/if}
			</span>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
			</svg>
		  </button>
		</div>
  
		<!-- Regeneration Warning -->
		<div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
		  <div class="flex items-start space-x-3">
			<svg class="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
			  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
			<div>
			  <h4 class="text-orange-800 font-medium text-sm">Important Note</h4>
			  <p class="text-orange-700 text-sm mt-1">
				Clicking "Regenerate My Analysis" will create fresh career insights based on your updated responses. 
				Your previous results will be replaced with new personalized documents.
			  </p>
			</div>
		  </div>
		</div>
	  </form>
	</div>
  </div>
  
  <style lang="postcss">
	@tailwind base;
	@tailwind components;
	@tailwind utilities;
	
	textarea {
	  transition: height 0.2s ease;
	}
  </style>