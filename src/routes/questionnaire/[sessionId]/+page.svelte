<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
  
	const sessionId = $page.params.sessionId;
	let sessionData: any = null;
	let isLoading = true;
	let hasUnsavedChanges = false;
  
	onMount(async () => {
	  // Fetch session data
	  const { data, error } = await supabase
		.from('questionnaire_sessions')
		.select('*')
		.eq('id', sessionId)
		.single();
  
	  if (data) {
		sessionData = data;
	  }
	  isLoading = false;
	});
  
	function markAsChanged() {
	  hasUnsavedChanges = true;
	}
  
	function goToStep(step: string) {
	  goto(`/questionnaire/${sessionId}/${step}`);
	}
  
	function goToDashboard() {
	  goto(`/dashboard/${sessionId}`);
	}
  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
	<div class="max-w-4xl mx-auto">
	  
	  <!-- Back to Dashboard Navigation -->
	  <div class="flex justify-between items-center mb-6">
		<button 
		  on:click={goToDashboard}
		  class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
		>
		  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
		  </svg>
		  <span>Back to Dashboard</span>
		</button>
		
		{#if hasUnsavedChanges}
		  <div class="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center space-x-2">
			<svg class="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
			  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
			<span class="text-yellow-800 text-sm">You have unsaved changes</span>
		  </div>
		{/if}
	  </div>
  
	  {#if isLoading}
		<div class="bg-white rounded-2xl shadow-xl p-8 text-center">
		  <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
		  <p class="text-gray-600">Loading your session...</p>
		</div>
	  {:else if sessionData}
		<!-- Welcome Header -->
		<div class="text-center mb-12">
		  <h1 class="text-4xl font-bold text-gray-800 mb-4">
			Welcome to Your UniqU Journey! 🌟
		  </h1>
		  <p class="text-xl text-gray-600 max-w-2xl mx-auto">
			Let's discover your unique career path through a thoughtful 3-step process. 
			Each step builds on the previous one to create your personalized profile.
		  </p>
		</div>
  
		<!-- Progress Overview -->
		<div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
		  <h2 class="text-2xl font-semibold text-gray-800 mb-6 text-center">Your Progress</h2>
		  
		  <div class="flex justify-between items-center mb-8">
			<!-- Step 1 -->
			<div class="flex flex-col items-center flex-1">
			  <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 
				{sessionData.cv_text ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
				{#if sessionData.cv_text}
				  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
				  </svg>
				{:else}
				  <span class="font-semibold">1</span>
				{/if}
			  </div>
			  <span class="text-sm font-medium text-gray-600">CV & Experience</span>
			</div>
			
			<!-- Connection Line -->
			<div class="flex-1 h-0.5 mx-4 {sessionData.cv_text ? 'bg-green-500' : 'bg-gray-200'}"></div>
			
			<!-- Step 2 -->
			<div class="flex flex-col items-center flex-1">
			  <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 
				{sessionData.ikigai_love ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
				{#if sessionData.ikigai_love}
				  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
				  </svg>
				{:else}
				  <span class="font-semibold">2</span>
				{/if}
			  </div>
			  <span class="text-sm font-medium text-gray-600">Ikigai Discovery</span>
			</div>
			
			<!-- Connection Line -->
			<div class="flex-1 h-0.5 mx-4 {sessionData.ikigai_love ? 'bg-green-500' : 'bg-gray-200'}"></div>
			
			<!-- Step 3 -->
			<div class="flex flex-col items-center flex-1">
			  <div class="w-12 h-12 rounded-full flex items-center justify-center mb-2 
				{sessionData.goals ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}">
				{#if sessionData.goals}
				  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
				  </svg>
				{:else}
				  <span class="font-semibold">3</span>
				{/if}
			  </div>
			  <span class="text-sm font-medium text-gray-600">Goals & Context</span>
			</div>
		  </div>
		</div>
  
		<!-- Step Cards -->
		<div class="grid md:grid-cols-3 gap-6 mb-8">
		  
		  <!-- Step 1: CV -->
		  <div class="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
			<div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
			  <div class="text-white">
				<div class="flex items-center justify-between mb-2">
				  <h3 class="text-lg font-semibold">Step 1: Your Experience</h3>
				  {#if sessionData.cv_text}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
					</svg>
				  {/if}
				</div>
				<p class="text-blue-100 text-sm">Share your professional background and experiences</p>
			  </div>
			</div>
			<div class="p-6">
			  <p class="text-gray-600 mb-4">
				Upload your CV or tell us about your work experience, education, and key achievements.
			  </p>
			  <button 
				on:click={() => goToStep('cv')}
				class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
			  >
				{sessionData.cv_text ? 'Edit Experience' : 'Start Here'}
			  </button>
			</div>
		  </div>
  
		  <!-- Step 2: Ikigai -->
		  <div class="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
			<div class="bg-gradient-to-r from-green-500 to-teal-600 p-6">
			  <div class="text-white">
				<div class="flex items-center justify-between mb-2">
				  <h3 class="text-lg font-semibold">Step 2: Your Ikigai</h3>
				  {#if sessionData.ikigai_love}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
					</svg>
				  {/if}
				</div>
				<p class="text-green-100 text-sm">Discover what gives your life meaning and purpose</p>
			  </div>
			</div>
			<div class="p-6">
			  <p class="text-gray-600 mb-4">
				Explore what you love, what you're good at, what inspires you, and what you care about.
			  </p>
			  <button 
				on:click={() => goToStep('ikigai')}
				class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
				disabled={!sessionData.cv_text}
			  >
				{sessionData.ikigai_love ? 'Edit Ikigai' : sessionData.cv_text ? 'Continue' : 'Complete Step 1 First'}
			  </button>
			</div>
		  </div>
  
		  <!-- Step 3: Goals -->
		  <div class="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow">
			<div class="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
			  <div class="text-white">
				<div class="flex items-center justify-between mb-2">
				  <h3 class="text-lg font-semibold">Step 3: Your Goals</h3>
				  {#if sessionData.goals}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
					</svg>
				  {/if}
				</div>
				<p class="text-purple-100 text-sm">Define your aspirations and personal context</p>
			  </div>
			</div>
			<div class="p-6">
			  <p class="text-gray-600 mb-4">
				Tell us about your career goals, personality, and life context to complete your profile.
			  </p>
			  <button 
				on:click={() => goToStep('final')}
				class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
				disabled={!sessionData.ikigai_love}
			  >
				{sessionData.goals ? 'Edit Goals' : sessionData.ikigai_love ? 'Continue' : 'Complete Step 2 First'}
			  </button>
			</div>
		  </div>
		</div>
  
		<!-- Instructions -->
		<div class="bg-white rounded-2xl shadow-xl p-8 text-center">
		  <h3 class="text-xl font-semibold text-gray-800 mb-3">💡 How it Works</h3>
		  <p class="text-gray-600 mb-4">
			Complete all three steps to build your comprehensive career profile. Once finished, 
			we'll generate personalized insights including a reflection letter, career themes, 
			and ideal company matches.
		  </p>
		  <div class="text-sm text-gray-500">
			⏱️ Total time: 15-20 minutes • 🔒 Your data is private and secure
		  </div>
		</div>
	  {:else}
		<div class="bg-white rounded-2xl shadow-xl p-8 text-center">
		  <p class="text-red-500 text-lg">Session not found.</p>
		  <button 
			on:click={() => goto('/')}
			class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
		  >
			Go Back Home
		  </button>
		</div>
	  {/if}
	</div>
  </div>