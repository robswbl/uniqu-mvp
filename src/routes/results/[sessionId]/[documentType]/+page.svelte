<!-- src/routes/results/[sessionId]/[documentType]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import './document-content.css';
  import { get } from 'svelte/store';
  import { t } from 'svelte-i18n';

  // Replace static assignment with reactive declarations
  $: sessionId = $page.params.sessionId;
  $: documentType = $page.params.documentType;
  
  let documentData: any = null;
  let isLoading = true;

  async function fetchDocument() {
    isLoading = true;
    documentData = null;
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .select('content_html, document_type, created_at, pdf_url')
        .eq('session_id', sessionId)
        .eq('document_type', documentType)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) {
        console.error('Supabase error:', error);
      } else if (data && data.length > 0) {
        documentData = data[0];
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      isLoading = false;
    }
  }

  // Remove onMount(fetchDocument); as the reactive statement will handle all cases.

  $: if ($page.params.documentType) {
    fetchDocument();
  }

  $: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';

  function getDocumentTitle(type: string): string {
    switch(type) {
      case 'reflection_letter': return $t('document.reflection_letter');
      case 'career_themes': return $t('document.career_themes');
      case 'ideal_companies': return $t('document.ideal_companies');
      case 'matching_companies': return $t('document.matching_companies');
      case 'application_letter': return $t('document.application_letter');
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  }

  function getDocumentDescription(type: string): string {
    switch(type) {
      case 'reflection_letter': return $t('document.reflection_letter_desc');
      case 'career_themes': return $t('document.career_themes_desc');
      case 'ideal_companies': return $t('document.ideal_companies_desc');
      case 'matching_companies': return $t('document.matching_companies_desc');
      case 'application_letter': return $t('document.application_letter_desc');
      default: return $t('document.default_desc');
    }
  }

  function processHtmlContent(html: string): string {
    if (!html) return '';
    
    // Remove inline styles that might be causing font size issues
    return html
      .replace(/style="[^"]*font-size[^"]*"/gi, '') // Remove font-size from style attributes
      .replace(/style="[^"]*font-family[^"]*"/gi, '') // Remove font-family from style attributes
      .replace(/style="[^"]*"/gi, '') // Remove all style attributes
      .replace(/font-size:\s*[^;]+;?/gi, '') // Remove font-size from style content
      .replace(/font-family:\s*[^;]+;?/gi, ''); // Remove font-family from style content
  }

  function downloadDocument(): void {
    if (!documentData) {
      alert('No document to download');
      return;
    }
    
    if (!documentData.pdf_url) {
      alert('PDF not available for this document');
      return;
    }
    
    try {
      console.log('Starting PDF download from URL:', documentData.pdf_url);
      
      const title = getDocumentTitle(documentData.document_type);
      const link = document.createElement('a');
      link.href = documentData.pdf_url;
      link.download = `${title.replace(/\s+/g, '_')}_UniqU.pdf`;
      link.target = '_blank'; // Open in new tab as backup
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('PDF download initiated');
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF download failed. Please try again.');
    }
  }
</script>

<svelte:head>
  <title>{getDocumentTitle(documentType)} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-4xl mx-auto">
    {#if !fromOnboarding}
    <!-- Header -->
    <div class="mb-6">
      <button 
        on:click={() => goto(`/results/${sessionId}`)}
        class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-3"
        type="button"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {$t('document.back_to_results')}
      </button>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900 mb-1">{getDocumentTitle(documentType)}</h1>
          <p class="text-gray-600 text-sm">{getDocumentDescription(documentType)}</p>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            on:click={() => goto(`/dashboard/${sessionId}`)}
            class="flex items-center space-x-1 px-3 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors text-sm"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
            </svg>
            <span>Dashboard</span>
          </button>
          <button 
            on:click={() => goto(`/questionnaire/${sessionId}`)}
            class="flex items-center space-x-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <span>Edit Answers</span>
          </button>
        </div>
      </div>
    </div>
    {/if}
    {#if isLoading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    {:else if documentData}
      <!-- Document Content -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden relative">
        <div class="document-content px-12 py-10">
          {@html processHtmlContent(documentData.content_html)}
        </div>
        
        <!-- Download button positioned in bottom-right of document -->
        <div class="absolute bottom-4 right-4">
          <button 
            on:click={downloadDocument}
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center space-x-2 shadow-lg"
            type="button"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-4-4m4 4l4-4m-6 4h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2h8"/>
            </svg>
            <span>{$t('buttons.download')}</span>
          </button>
        </div>
      </div>

      <!-- Explore More Section -->
      {#if !fromOnboarding}
      <div class="mt-6 bg-white rounded-xl shadow-lg p-6 text-center">
        <h3 class="text-lg font-semibold text-gray-800 mb-2">✨ {$t('document.explore_more')}</h3>
        <p class="text-gray-600 mb-4 text-sm">{$t('document.explore_more_desc')}</p>
        <div class="flex justify-center space-x-3 flex-wrap gap-y-2">
          <button 
            on:click={() => goto(`/results/${sessionId}`)}
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            type="button"
          >
            {$t('document.view_all_results')}
          </button>
          <button 
            on:click={() => goto(`/questionnaire/${sessionId}`)}
            class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            type="button"
          >
            {$t('document.update_profile')}
          </button>
          <button 
            on:click={() => goto(`/dashboard/${sessionId}`)}
            class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
            type="button"
          >
            {$t('document.dashboard')}
          </button>
        </div>
      </div>
      {/if}
      <div class="mt-8 flex justify-center">
        {#if documentType === 'reflection_letter'}
          <button on:click={() => goto(`/results/${sessionId}/career_themes${fromOnboarding ? '?from=onboarding' : ''}`)} class="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:from-pink-600 hover:to-orange-600 transition-colors text-lg">
            {$t('document.reveal_next_insight')}
          </button>
        {:else if documentType === 'career_themes'}
          <button on:click={() => goto(`/results/${sessionId}/ideal_companies${fromOnboarding ? '?from=onboarding' : ''}`)} class="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:from-pink-600 hover:to-orange-600 transition-colors text-lg">
            {$t('document.reveal_final_suggestion')}
          </button>
        {:else if documentType === 'ideal_companies'}
          <button on:click={() => goto(`/results/${sessionId}/next-steps${fromOnboarding ? '?from=onboarding' : ''}`)} class="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-colors text-lg">
            {$t('document.see_what_happens_next')}
          </button>
        {/if}
      </div>
    {:else}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">{$t('document.not_found')}</h2>
        <p class="text-red-500 text-lg mb-4">
          {$t('document.not_found_desc')}
        </p>
        <div class="flex justify-center space-x-4">
          <button 
            on:click={() => goto(`/results/${sessionId}`)}
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
            type="button"
          >
            {$t('document.back_to_results')}
          </button>
          <button 
            on:click={() => goto(`/dashboard/${sessionId}`)}
            class="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold"
            type="button"
          >
            {$t('document.dashboard')}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>