<script lang="ts">
    import { page } from '$app/stores';
    import { supabase } from '$lib/supabaseClient';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { t } from 'svelte-i18n';
  
    const sessionId = $page.params.sessionId;
    let sessionData: any = null;
    let isLoading = true;
    let hasResults = false;
    let expandedSections: { [key: string]: boolean } = {};
    let lastUpdated = '';
    let completionPercentage = 0;
    let documentCount = 0;
    let recentActivity = '';
    let userData: any = null;

    // Calculate completion stats
    function calculateCompletionStats() {
      if (!sessionData) return;
      
      const fields = [
        sessionData.cv_text,
        sessionData.ikigai_love,
        sessionData.ikigai_good_at,
        sessionData.ikigai_care_about,
        sessionData.ikigai_inspires,
        sessionData.ikigai_want_to_be,
        sessionData.goals,
        sessionData.personality_values,
        sessionData.life_context,
        sessionData.doubts_barriers,
        sessionData.emotional_landscape
      ];
      
      const completedFields = fields.filter(field => field && field.trim().length > 0).length;
      completionPercentage = Math.round((completedFields / fields.length) * 100);
      
      // Set last updated
      if (sessionData.created_at) {
        const date = new Date(sessionData.created_at);
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
          .select('user_id, status, cv_text, ikigai_love, ikigai_good_at, ikigai_care_about, ikigai_inspires, ikigai_want_to_be, goals, personality_values, life_context, doubts_barriers, emotional_landscape, created_at, onboarding_completed')
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

        // Security check: ensure current user can access this session
        const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (currentUserId && currentUserId !== session.user_id) {
          // Redirect to current user's session if available
          const { data: userSession } = await supabase
            .from('questionnaire_sessions')
            .select('id')
            .eq('user_id', currentUserId)
            .maybeSingle();
          
          if (userSession) {
            goto(`/dashboard/${userSession.id}`);
            return;
          } else {
            goto('/');
            return;
          }
        }

        // Fetch user data to get first name and email
        if (session.user_id) {
          console.log('Fetching user data for user_id:', session.user_id);
          
          // First, try to get all columns to see what's available
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('user_uuid', session.user_id)
            .single();
          
          console.log('User fetch result (all columns):', { user, userError });
          
          if (!userError && user) {
            userData = user;
            console.log('User data set:', userData);
          } else {
            console.error('User fetch error:', userError);
          }
        } else {
          console.log('No user_id found in session:', session);
        }

        // Check if results exist (generated_documents + application_letters)
        const { data: results, error: resultsError } = await supabase
          .from('generated_documents')
          .select('document_type, created_at')
          .eq('session_id', sessionId);

        // Also count application letters
        const { data: applicationLetters, error: lettersError } = await supabase
          .from('application_letters')
          .select('created_at')
          .eq('session_id', sessionId);

        console.log('Results fetch result:', { results, resultsError, applicationLetters, lettersError });

        let totalDocuments = 0;
        let allDocuments: any[] = [];

        if (!resultsError && results) {
          totalDocuments += results.length;
          allDocuments = [...results];
        }

        if (!lettersError && applicationLetters) {
          totalDocuments += applicationLetters.length;
          allDocuments = [...allDocuments, ...applicationLetters];
        }

        if (totalDocuments > 0) {
          hasResults = true;
          documentCount = totalDocuments;
          
          // Get most recent document creation time
          const latestDoc = allDocuments.reduce((latest: any, current: any) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          );
          lastUpdated = new Date(latestDoc.created_at).toLocaleDateString();

          // If documents exist but status is not completed, update it
          if (session.status !== 'completed') {
            console.log('Documents exist but status is not completed, updating status...');
            const { error: statusUpdateError } = await supabase
              .from('questionnaire_sessions')
              .update({ status: 'completed' })
              .eq('id', sessionId);
            
            if (!statusUpdateError) {
              session.status = 'completed';
              console.log('Status updated to completed');
            } else {
              console.error('Failed to update status:', statusUpdateError);
            }
          }
        }
  
        sessionData = session;
        calculateCompletionStats();
        console.log('Dashboard loaded successfully:', { sessionData, hasResults, documentCount, userData });
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
      expandedSections = { ...expandedSections, [sectionKey]: !expandedSections[sectionKey] };
    }

    function handleA11yClick(event: KeyboardEvent, handler: () => void) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler();
      }
    }
  
    function getDisplayText(text: string | null, sectionKey: string, maxLength: number = 120): string {
      if (!text) return 'Not provided';
      if (expandedSections[sectionKey] || text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength) + '...';
    }

    function hasMoreContent(text: string | null, maxLength: number = 120): boolean {
      return Boolean(text && text.length > maxLength);
    }

    function getEditUrl(sectionKey: string): string {
      const urlParams = $page.url.searchParams;
      const fromOnboarding = urlParams.get('from') === 'onboarding';
      const baseUrl = `/questionnaire/${sessionId}`;
      
      switch (sectionKey) {
        case 'cv':
          return `${baseUrl}/step2${fromOnboarding ? '?from=onboarding' : ''}`;
        case 'love':
        case 'good_at':
        case 'care_about':
        case 'inspires':
        case 'want_to_be':
          return `${baseUrl}/step3/${sectionKey}${fromOnboarding ? '?from=onboarding' : ''}`;
        case 'goals':
        case 'personality_values':
        case 'life_context':
        case 'doubts_barriers':
        case 'emotional_landscape':
          return `${baseUrl}/step1/${sectionKey}${fromOnboarding ? '?from=onboarding' : ''}`;
        default:
          return baseUrl;
      }
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
    function getCareAboutStatus() { return getSectionStatus(sessionData?.ikigai_care_about); }
    function getGoodStatus() { return getSectionStatus(sessionData?.ikigai_good_at); }
    function getWantToBeStatus() { return getSectionStatus(sessionData?.ikigai_want_to_be); }
    function getGoalsStatus() { return getSectionStatus(sessionData?.goals); }
    function getInspiresStatus() { return getSectionStatus(sessionData?.ikigai_inspires); }
    function getValuesStatus() { return getSectionStatus(sessionData?.personality_values); }
    function getLifeContextStatus() { return getSectionStatus(sessionData?.life_context); }
    function getDoubtsStatus() { return getSectionStatus(sessionData?.doubts_barriers); }
    function getEmotionalStatus() { return getSectionStatus(sessionData?.emotional_landscape); }

    function viewAllDocuments() {
      goto(`/results/${sessionId}/all-documents`);
    }

    // Add these computed translations in the script block:
    $: viewResultsText = $t('dashboard.view_results');
    $: processingText = $t('dashboard.processing');
    $: seeYourPersonalizedAnalysis = $t('dashboard.see_your_personalized_analysis');
    $: resultsBeingGenerated = $t('dashboard.results_being_generated');
  </script>
  
  <div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
    <div class="max-w-6xl mx-auto">
      <!-- Enhanced Header with Achievement Badge -->
      <div class="text-center mb-8 pt-8">
        <div class="flex items-center justify-center mb-4">
          <h1 class="text-4xl font-bold text-gray-800 mr-4">
            {userData?.user_firstname ? `${$t('dashboard.welcome_back')}, ${userData.user_firstname}` : $t('dashboard.welcome_back')} 🎉
          </h1>
          {#if !isLoading && sessionData}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white {getAchievementBadge().color}">
              {getAchievementBadge().icon} {getAchievementBadge().text}
            </span>
          {/if}
        </div>
        <p class="text-xl text-gray-600 mb-2">{$t('dashboard.profile_complete')}</p>
        {#if recentActivity}
          <p class="text-sm text-gray-500">
            {$t('dashboard.last_updated')} {recentActivity}{userData?.user_email || userData?.email ? ` • ${userData.user_email || userData.email}` : ''}
          </p>
        {/if}
      </div>

      {#if isLoading}
        <div class="bg-white rounded-xl shadow-lg p-8 text-center">
          <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-600">{$t('dashboard.loading_session_details')}</p>
        </div>
      {:else if sessionData}
        <!-- Progress Overview Card -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-semibold text-gray-800">{$t('dashboard.profile_progress')}</h2>
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
              <div class="text-sm text-gray-600">{$t('dashboard.profile_complete_label')}</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors" on:click={viewAllDocuments} title="{$t('dashboard.view_all_documents')}" role="button" tabindex="0" on:keydown={(e) => handleA11yClick(e, viewAllDocuments)}>
              <div class="text-2xl font-bold text-green-600 underline">{documentCount}</div>
              <div class="text-sm text-gray-600">{$t('dashboard.documents_generated')}</div>
            </div>
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">{sessionData.status}</div>
              <div class="text-sm text-gray-600">{$t('dashboard.current_status')}</div>
            </div>
          </div>
        </div>

        <!-- Main Action Cards -->
        <div class="grid md:grid-cols-3 gap-6 mb-8">
          <!-- View Results Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">{$t('dashboard.view_your_results')}</h3>
              <p class="text-gray-600 mb-4">
                {hasResults ? seeYourPersonalizedAnalysis : resultsBeingGenerated}
              </p>
              {#if hasResults && lastUpdated}
                <p class="text-sm text-gray-500 mb-4">{$t('dashboard.last_generated')} {lastUpdated}</p>
              {/if}
              <button 
                on:click={viewResults}
                class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                disabled={!hasResults}
              >
                {hasResults ? viewResultsText : processingText}
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
              <h3 class="text-xl font-semibold text-gray-800 mb-2">{$t('dashboard.edit_your_profile')}</h3>
              <p class="text-gray-600 mb-4">{$t('dashboard.update_your_responses')}</p>
              <button 
                on:click={editAnswers}
                class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {$t('dashboard.edit_profile')}
              </button>
            </div>
          </div>

          <!-- Application Letters Card -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div class="text-center">
              <div class="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-800 mb-2">{$t('dashboard.application_letters')}</h3>
              <p class="text-gray-600 mb-4">{$t('dashboard.view_and_manage_letters')}</p>
              <button 
                on:click={() => goto(`/results/${sessionId}/letters`)}
                class="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {$t('dashboard.view_letters')}
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
                <h3 class="text-lg font-semibold text-yellow-800 mb-1">{$t('dashboard.results_in_progress')}</h3>
                <p class="text-yellow-700">
                  {$t('dashboard.personalized_analysis_being_generated')}
                </p>
              </div>
            </div>
          </div>
        {/if}
  
        <!-- Enhanced Profile Summary -->
        <div class="bg-white rounded-xl shadow-lg p-8">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-800">{$t('dashboard.your_profile_summary')}</h2>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-500">{$t('dashboard.profile_status')}:</span>
              <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {sessionData.status}
              </span>
            </div>
          </div>
          
          <div class="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">📄</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.cv_summary')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.cv_text, 150)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('cv'); }}
                      >
                        {expandedSections['cv'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('cv')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('cv'))}
                >
                  {expandedSections['cv'] ? sessionData.cv_text : (sessionData.cv_text && sessionData.cv_text.length > 150 ? sessionData.cv_text.substring(0, 150) + '...' : sessionData.cv_text)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('cv')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>
  
              <div class="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">❤️</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.what_you_love')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.ikigai_love, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('love'); }}
                      >
                        {expandedSections['love'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('love')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('love'))}
                >
                  {expandedSections['love'] ? sessionData.ikigai_love : (sessionData.ikigai_love && sessionData.ikigai_love.length > 120 ? sessionData.ikigai_love.substring(0, 120) + '...' : sessionData.ikigai_love)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('love')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

              <div class="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🌍</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.what_you_care_about')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.ikigai_care_about, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('care_about'); }}
                      >
                        {expandedSections['care_about'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('care_about')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('care_about'))}
                >
                  {expandedSections['care_about'] ? sessionData.ikigai_care_about : (sessionData.ikigai_care_about && sessionData.ikigai_care_about.length > 120 ? sessionData.ikigai_care_about.substring(0, 120) + '...' : sessionData.ikigai_care_about)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('care_about')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

              <div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🌟</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.what_inspires_you')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.ikigai_inspires, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('inspires'); }}
                      >
                        {expandedSections['inspires'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('inspires')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('inspires'))}
                >
                  {expandedSections['inspires'] ? sessionData.ikigai_inspires : (sessionData.ikigai_inspires && sessionData.ikigai_inspires.length > 120 ? sessionData.ikigai_inspires.substring(0, 120) + '...' : sessionData.ikigai_inspires)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('inspires')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

              <div class="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🎭</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.who_you_want_to_be')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.ikigai_want_to_be, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('want_to_be'); }}
                      >
                        {expandedSections['want_to_be'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('want_to_be')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('want_to_be'))}
                >
                  {expandedSections['want_to_be'] ? sessionData.ikigai_want_to_be : (sessionData.ikigai_want_to_be && sessionData.ikigai_want_to_be.length > 120 ? sessionData.ikigai_want_to_be.substring(0, 120) + '...' : sessionData.ikigai_want_to_be)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('want_to_be')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

              <div class="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">⭐</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.what_youre_good_at')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.ikigai_good_at, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('good'); }}
                      >
                        {expandedSections['good'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('good')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('good'))}
                >
                  {expandedSections['good'] ? sessionData.ikigai_good_at : (sessionData.ikigai_good_at && sessionData.ikigai_good_at.length > 120 ? sessionData.ikigai_good_at.substring(0, 120) + '...' : sessionData.ikigai_good_at)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('good_at')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>
  
              <div class="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">🎯</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.your_goals')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.goals, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('goals'); }}
                      >
                        {expandedSections['goals'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('goals')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('goals'))}
                >
                  {expandedSections['goals'] ? sessionData.goals : (sessionData.goals && sessionData.goals.length > 120 ? sessionData.goals.substring(0, 120) + '...' : sessionData.goals)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('goals')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

              <div class="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">💎</span>
                    <h3 class="font-semibold text-gray-700">{$t('dashboard.your_values')}</h3>
                  </div>
                  <div class="flex items-center space-x-2">
                    {#if hasMoreContent(sessionData.personality_values, 120)}
                      <button 
                        type="button"
                        class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        on:click={(e) => { e.stopPropagation(); toggleSection('values'); }}
                      >
                        {expandedSections['values'] ? '▼ Less' : '▶ More'}
                      </button>
                    {/if}
                  </div>
                </div>
                <button 
                  type="button"
                  class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                  on:click={() => toggleSection('values')} 
                  on:keydown={(e) => handleA11yClick(e, () => toggleSection('values'))}
                >
                  {expandedSections['values'] ? sessionData.personality_values : (sessionData.personality_values && sessionData.personality_values.length > 120 ? sessionData.personality_values.substring(0, 120) + '...' : sessionData.personality_values)}
                </button>
                <button 
                  class="absolute bottom-2 right-2 text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-2 py-1 rounded transition-colors"
                  on:click={(e) => { e.stopPropagation(); goto(getEditUrl('personality_values')); }}
                >
                  {$t('dashboard.edit')}
                </button>
              </div>

            <div class="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-lg">🏠</span>
                  <h3 class="font-semibold text-gray-700">{$t('dashboard.life_context')}</h3>
                </div>
                <div class="flex items-center space-x-2">
                  {#if hasMoreContent(sessionData.life_context, 120)}
                    <button 
                      type="button"
                      class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      on:click={(e) => { e.stopPropagation(); toggleSection('life_context'); }}
                    >
                      {expandedSections['life_context'] ? '▼ Less' : '▶ More'}
                    </button>
                  {/if}
                </div>
              </div>
              <button 
                type="button"
                class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                on:click={() => toggleSection('life_context')} 
                on:keydown={(e) => handleA11yClick(e, () => toggleSection('life_context'))}
              >
                {expandedSections['life_context'] ? sessionData.life_context : (sessionData.life_context && sessionData.life_context.length > 120 ? sessionData.life_context.substring(0, 120) + '...' : sessionData.life_context)}
              </button>
              <button 
                class="absolute bottom-2 right-2 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-1 rounded transition-colors"
                on:click={(e) => { e.stopPropagation(); goto(getEditUrl('life_context')); }}
              >
                {$t('dashboard.edit')}
              </button>
            </div>

            <div class="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-lg">🤔</span>
                  <h3 class="font-semibold text-gray-700">{$t('dashboard.doubts_barriers')}</h3>
                </div>
                <div class="flex items-center space-x-2">
                  {#if hasMoreContent(sessionData.doubts_barriers, 120)}
                    <button 
                      type="button"
                      class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      on:click={(e) => { e.stopPropagation(); toggleSection('doubts'); }}
                    >
                      {expandedSections['doubts'] ? '▼ Less' : '▶ More'}
                    </button>
                  {/if}
                </div>
              </div>
              <button 
                type="button"
                class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                on:click={() => toggleSection('doubts')} 
                on:keydown={(e) => handleA11yClick(e, () => toggleSection('doubts'))}
              >
                {expandedSections['doubts'] ? sessionData.doubts_barriers : (sessionData.doubts_barriers && sessionData.doubts_barriers.length > 120 ? sessionData.doubts_barriers.substring(0, 120) + '...' : sessionData.doubts_barriers)}
              </button>
              <button 
                class="absolute bottom-2 right-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-1 rounded transition-colors"
                on:click={(e) => { e.stopPropagation(); goto(getEditUrl('doubts_barriers')); }}
              >
                {$t('dashboard.edit')}
              </button>
            </div>

            <div class="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg hover:shadow-md transition-all duration-300 relative break-inside-avoid mb-6">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-lg">💭</span>
                  <h3 class="font-semibold text-gray-700">{$t('dashboard.emotional_landscape')}</h3>
                </div>
                <div class="flex items-center space-x-2">
                  {#if hasMoreContent(sessionData.emotional_landscape, 120)}
                    <button 
                      type="button"
                      class="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      on:click={(e) => { e.stopPropagation(); toggleSection('emotional'); }}
                    >
                      {expandedSections['emotional'] ? '▼ Less' : '▶ More'}
                    </button>
                  {/if}
                </div>
              </div>
              <button 
                type="button"
                class="text-gray-600 text-sm leading-relaxed cursor-pointer" 
                on:click={() => toggleSection('emotional')} 
                on:keydown={(e) => handleA11yClick(e, () => toggleSection('emotional'))}
              >
                {expandedSections['emotional'] ? sessionData.emotional_landscape : (sessionData.emotional_landscape && sessionData.emotional_landscape.length > 120 ? sessionData.emotional_landscape.substring(0, 120) + '...' : sessionData.emotional_landscape)}
              </button>
              <button 
                class="absolute bottom-2 right-2 text-xs bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-1 rounded transition-colors"
                on:click={(e) => { e.stopPropagation(); goto(getEditUrl('emotional_landscape')); }}
              >
                {$t('dashboard.edit')}
              </button>
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
          <h3 class="text-xl font-semibold text-gray-800 mb-2">{$t('dashboard.could_not_load_session_details')}</h3>
          <p class="text-gray-600 mb-4">{$t('dashboard.issue_loading_profile_information')}</p>
          <div class="space-y-2">
            <button 
              on:click={() => window.location.reload()}
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg mr-2"
            >
              {$t('dashboard.try_again')}
            </button>
            <button 
              on:click={() => goto('/')}
              class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              {$t('dashboard.go_back_home')}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>