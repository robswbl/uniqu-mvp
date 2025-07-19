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
    let lastUpdated = '';
    let completionPercentage = 0;
    let documentCount = 0;
    let recentActivity = '';

    // Calculate completion stats
    function calculateCompletionStats() {
      if (!sessionData) return;
      
      const fields = [
        sessionData.cv_text,
        sessionData.ikigai_love,
        sessionData.ikigai_good_at,
        sessionData.ikigai_care_about,
        sessionData.ikigai_inspires,
        sessionData.goals,
        sessionData.personality_values
      ];
      
      const completedFields = fields.filter(field => field && field.trim().length > 0).length;
      completionPercentage = Math.round((completedFields / fields.length) * 100);
      
      // Set last updated
      if (sessionData.updated_at) {
        const date = new Date(sessionData.updated_at);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
          recentActivity = 'Just now';
        } else if (diffInHours < 24) {
          recentActivity = `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          recentActivity = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        }
      }
    }

    function getAchievementBadge() {
      if (completionPercentage >= 100) return { text: 'Profile Complete!', color: 'bg-green-500', icon: '🏆' };
      if (completionPercentage >= 80) return { text: 'Almost There!', color: 'bg-blue-500', icon: '🎯' };
      if (completionPercentage >= 60) return { text: 'Great Progress!', color: 'bg-purple-500', icon: '⭐' };
      if (completionPercentage >= 40) return { text: 'Getting Started', color: 'bg-orange-500', icon: '🌱' };
      return { text: 'Just Beginning', color: 'bg-gray-500', icon: '🚀' };
    }
  
    onMount(async () => {
      try {
        console.log('Loading dashboard for session:', sessionId);
        
        // Fetch session data for summary (using correct column names from schema)
        const { data: session, error: sessionError } = await supabase
          .from('questionnaire_sessions')
          .select('user_id, status, cv_text, ikigai_love, ikigai_good_at, ikigai_care_about, ikigai_inspires, goals, personality_values, updated_at')
          .eq('id', sessionId)
          .single();
        
        console.log('Session fetch result:', { session, sessionError });
        
        if (sessionError) {
          console.error('Session fetch error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          throw new Error('No session found with ID: ' + sessionId);
        }
  
        // Check if results exist
        const { data: results, error: resultsError } = await supabase
          .from('generated_documents')
          .select('document_type, created_at')
          .eq('session_id', sessionId);

        console.log('Results fetch result:', { results, resultsError });

        if (!resultsError && results && results.length > 0) {
          hasResults = true;
          documentCount = results.length;
          
          // Get most recent document creation time
          const latestDoc = results.reduce((latest: any, current: any) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );
          lastUpdated = new Date(latestDoc.created_at).toLocaleDateString();
        }
  
        sessionData = session;
        calculateCompletionStats();
        console.log('Dashboard loaded successfully:', { sessionData, hasResults, documentCount });
      } catch (error) {
        console.error('Error loading dashboard:', error);
        // Don't throw here, let the UI show the error state
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

    function getSectionStatus(text: string | null): { status: string; color: string; icon: string } {
      if (!text || text.trim().length === 0) {
        return { status: 'Not Started', color: 'text-gray-500', icon: '⭕' };
      }
      if (text.length < 50) {
        return { status: 'Started', color: 'text-yellow-600', icon: '🟡' };
      }
      return { status: 'Complete', color: 'text-green-600', icon: '✅' };
    }

    // Helper function to get status for template
    function getCvStatus() { return getSectionStatus(sessionData?.cv_text); }
    function getLoveStatus() { return getSectionStatus(sessionData?.ikigai_love); }
    function getGoodStatus() { return getSectionStatus(sessionData?.ikigai_good_at); }
    function getGoalsStatus() { return getSectionStatus(sessionData?.goals); }
    function getInspiresStatus() { return getSectionStatus(sessionData?.ikigai_inspires); }
    function getValuesStatus() { return getSectionStatus(sessionData?.personality_values); }
  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
    <div class="max-w-6xl mx-auto">
      <!-- Enhanced Header with Achievement Badge -->
      <div class="text-center mb-8 pt-8">
        <div class="flex items-center justify-center mb-4">
          <h1 class="text-4xl font-bold text-gray-800 mr-4">Welcome Back! 🎉</h1>
          {#if !isLoading && sessionData}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white {getAchievementBadge().color}">
              {getAchievementBadge().icon} {getAchievementBadge().text}
            </span>
          {/if}
        </div>
        <p class="text-xl text-gray-600 mb-2">You have a completed UniqU profile. What would you like to do?</p>
        {#if recentActivity}
          <p class="text-sm text-gray-500">Last updated: {recentActivity}</p>
        {/if}
      </div>

      {#if isLoading}
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">Loading your session details...</p>
        </div>
      {:else if sessionData}
        <!-- Progress Overview Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-semibold text-gray-800">Profile Progress</h2>
            <span class="text-3xl font-bold text-indigo-600">{completionPercentage}%</span>
          </div>
          
          <!-- Progress Bar -->
          <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              class="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
              style="width: {completionPercentage}%"
            ></div>
          </div>
          
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center p-4 bg-indigo-50 rounded-lg">
              <div class="text-2xl font-bold text-indigo-600">{completionPercentage}%</div>
              <div class="text-sm text-gray-600">Profile Complete</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{documentCount}</div>
              <div class="text-sm text-gray-600">Documents Generated</div>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">{sessionData.status}</div>
              <div class="text-sm text-gray-600">Current Status</div>
            </div>
          </div>
        </div>

        <!-- Main Action Cards -->
        <div class="grid md:grid-cols-2 gap-6 mb-8">
          <!-- View Results Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">View Your Results</h3>
              <p class="text-gray-600 mb-4">
                {hasResults ? 'See your personalized career insights and analysis' : 'Results are being generated...'}
              </p>
              {#if hasResults && lastUpdated}
                <p class="text-sm text-gray-500 mb-4">Last generated: {lastUpdated}</p>
              {/if}
              <button 
                on:click={viewResults}
                class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                disabled={!hasResults}
              >
                {hasResults ? 'View Results' : 'Processing...'}
              </button>
            </div>
          </div>

          <!-- Edit Profile Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">Edit Your Profile</h3>
              <p class="text-gray-600 mb-4">Update your responses and regenerate your analysis</p>
              <button 
                on:click={editAnswers}
                class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {#if !hasResults}
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <svg class="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-yellow-800 mb-1">Results in Progress</h3>
                <p class="text-yellow-700">
                  Your personalized analysis is being generated. This usually takes 1-2 minutes. You'll be notified when it's ready!
                </p>
              </div>
            </div>
          </div>
        {/if}
  
        <!-- Enhanced Profile Summary -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-800">Your Profile Summary</h2>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">Profile Status:</span>
              <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {sessionData.status}
              </span>
            </div>
          </div>
          
          <div class="grid md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('cv')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">📄</span>
                    <h3 class="font-semibold text-gray-700">CV Summary</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getCvStatus().color}">{getCvStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['cv'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.cv_text, 'cv', 150)}
                </p>
              </div>
  
              <div class="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('love')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">❤️</span>
                    <h3 class="font-semibold text-gray-700">What You Love</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getLoveStatus().color}">{getLoveStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['love'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.ikigai_love, 'love', 120)}
                </p>
              </div>

              <div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('inspires')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🌟</span>
                    <h3 class="font-semibold text-gray-700">What Inspires You</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getInspiresStatus().color}">{getInspiresStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['inspires'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.ikigai_inspires, 'inspires', 120)}
                </p>
              </div>
            </div>
  
            <!-- Right Column -->
            <div class="space-y-4">
              <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('good')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">⭐</span>
                    <h3 class="font-semibold text-gray-700">What You're Good At</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getGoodStatus().color}">{getGoodStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['good'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.ikigai_good_at, 'good', 120)}
                </p>
              </div>
  
              <div class="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('goals')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🎯</span>
                    <h3 class="font-semibold text-gray-700">Your Goals</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getGoalsStatus().color}">{getGoalsStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['goals'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.goals, 'goals', 120)}
                </p>
              </div>

              <div class="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 cursor-pointer" on:click={() => toggleSection('values')}>
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">💎</span>
                    <h3 class="font-semibold text-gray-700">Your Values</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class="text-sm {getValuesStatus().color}">{getValuesStatus().icon}</span>
                    <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      {expandedSections['values'] ? '▼ Less' : '▶ More'}
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {getDisplayText(sessionData.personality_values, 'values', 120)}
                </p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Could not load session details</h3>
          <p class="text-gray-600 mb-4">There was an issue loading your profile information.</p>
          <div class="space-y-2">
            <button 
              on:click={() => window.location.reload()}
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg mr-2"
            >
              Try Again
            </button>
            <button 
              on:click={() => goto('/')}
              class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              Go Back Home
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>