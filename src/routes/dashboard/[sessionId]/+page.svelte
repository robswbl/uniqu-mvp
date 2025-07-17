<script lang="ts">
    import { page } from '$app/stores';
    import { supabase } from '$lib/supabaseClient';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
  
    const sessionId = $page.params.sessionId;
    let sessionData: any = null;
    let isLoading = true;
    let hasResults = false;
    let expandedSections: { [key: string]: boolean } = {};
  
    onMount(async () => {
      try {
        // Fetch session data for summary (using correct column names from schema)
        const { data: session, error: sessionError } = await supabase
          .from('questionnaire_sessions')
          .select('user_id, status, cv_text, ikigai_love, ikigai_good_at, ikigai_care_about, ikigai_inspires, goals, personality_values')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          throw sessionError;
        }
  
        // Check if results exist
        const { data: results, error: resultsError } = await supabase
          .from('generated_documents')
          .select('document_type')
          .eq('session_id', sessionId);
  
        if (!resultsError && results && results.length > 0) {
          hasResults = true;
        }
  
        sessionData = session;
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        isLoading = false;
      }
    });
  
    async function editAnswers() {
      // Only reset session to in-progress - DON'T clear results yet!
      // Results will be cleared by the questionnaire submission process AFTER new analysis succeeds
      const { error: statusError } = await supabase
        .from('questionnaire_sessions')
        .update({ status: 'in-progress' })
        .eq('id', sessionId);
  
      if (!statusError) {
        await goto(`/questionnaire/${sessionId}`);
      }
    }
  
    function toggleSection(sectionKey: string) {
      expandedSections[sectionKey] = !expandedSections[sectionKey];
    }
  
    function getDisplayText(text: string | null, sectionKey: string, maxLength: number = 120): string {
      if (!text) return 'Not provided';
      if (expandedSections[sectionKey] || text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength) + '...';
    }
  
    async function viewResults() {
      await goto(`/results/${sessionId}`);
    }
  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-8 pt-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-4">Welcome Back! 🎉</h1>
        <p class="text-xl text-gray-600">You have a completed UniqU profile. What would you like to do?</p>
      </div>
  
      {#if isLoading}
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Loading your session details...</p>
        </div>
      {:else if sessionData}
        <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 class="text-2xl font-semibold mb-6 text-gray-800">Your Profile Summary</h2>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('cv')}>
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-gray-700 mb-2">📄 CV Summary</h3>
                  <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                    {expandedSections['cv'] ? '▼ Less' : '▶ More'}
                  </button>
                </div>
                <p class="text-gray-600 text-sm">
                  {getDisplayText(sessionData.cv_text, 'cv', 150)}
                </p>
              </div>
  
              <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('love')}>
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-gray-700 mb-2">❤️ What You Love</h3>
                  <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                    {expandedSections['love'] ? '▼ Less' : '▶ More'}
                  </button>
                </div>
                <p class="text-gray-600 text-sm">
                  {getDisplayText(sessionData.ikigai_love, 'love', 120)}
                </p>
              </div>
            </div>
  
            <!-- Right Column -->
            <div class="space-y-4">
              <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('good')}>
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-gray-700 mb-2">⭐ What You're Good At</h3>
                  <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                    {expandedSections['good'] ? '▼ Less' : '▶ More'}
                  </button>
                </div>
                <p class="text-gray-600 text-sm">
                  {getDisplayText(sessionData.ikigai_good_at, 'good', 120)}
                </p>
              </div>
  
              <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('goals')}>
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-gray-700 mb-2">🎯 Your Goals</h3>
                  <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                    {expandedSections['goals'] ? '▼ Less' : '▶ More'}
                  </button>
                </div>
                <p class="text-gray-600 text-sm">
                  {getDisplayText(sessionData.goals, 'goals', 120)}
                </p>
              </div>
            </div>
          </div>
  
          <!-- Additional Row -->
          <div class="grid md:grid-cols-2 gap-6 mt-6">
            <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('inspires')}>
              <div class="flex justify-between items-start">
                <h3 class="font-semibold text-gray-700 mb-2">🌟 What Inspires You</h3>
                <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                  {expandedSections['inspires'] ? '▼ Less' : '▶ More'}
                </button>
              </div>
              <p class="text-gray-600 text-sm">
                {getDisplayText(sessionData.ikigai_inspires, 'inspires', 120)}
              </p>
            </div>
  
            <div class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" on:click={() => toggleSection('values')}>
              <div class="flex justify-between items-start">
                <h3 class="font-semibold text-gray-700 mb-2">💎 Your Values</h3>
                <button class="text-indigo-600 hover:text-indigo-800 text-sm">
                  {expandedSections['values'] ? '▼ Less' : '▶ More'}
                </button>
              </div>
              <p class="text-gray-600 text-sm">
                {getDisplayText(sessionData.personality_values, 'values', 120)}
              </p>
            </div>
          </div>
  
          <div class="bg-indigo-50 p-4 rounded-lg mt-6">
            <p class="text-sm text-indigo-700">
              <span class="font-semibold">Status:</span> 
              <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium ml-2">
                {sessionData.status}
              </span>
            </p>
          </div>
        </div>
  
        <!-- Action Buttons -->
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Edit Answers Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="text-center">
              <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">Edit Your Answers</h3>
              <p class="text-gray-600 mb-6">Update your responses and generate fresh insights</p>
              <button 
                on:click={editAnswers}
                class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Start Editing
              </button>
            </div>
          </div>
  
          <!-- View Results Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div class="text-center">
              <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">View Your Results</h3>
              <p class="text-gray-600 mb-6">
                {hasResults ? 'See your personalized career insights' : 'Results are being generated...'}
              </p>
              <button 
                on:click={viewResults}
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                disabled={!hasResults}
              >
                {hasResults ? 'View Results' : 'Processing...'}
              </button>
            </div>
          </div>
        </div>
  
        {#if !hasResults}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <p class="text-yellow-800 text-sm">
                Your results are still being generated. This usually takes a few minutes.
              </p>
            </div>
          </div>
        {/if}
      {:else}
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <p class="text-red-500 text-lg">Could not load session details.</p>
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
  
  <style lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  </style>