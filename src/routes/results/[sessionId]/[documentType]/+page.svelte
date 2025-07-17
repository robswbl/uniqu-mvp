<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // Make these reactive to route changes
  $: sessionId = $page.params.sessionId;
  $: documentType = $page.params.documentType;

  let document: any = null;
  let isLoading = true;
  let error: string | null = null;
  let availableDocuments: string[] = [];
  
  const documentOrder = ['reflection_letter', 'career_themes', 'ideal_companies'];
  
  // Make these reactive to documentType changes
  $: currentIndex = documentOrder.indexOf(documentType);
  $: nextDocument = currentIndex < documentOrder.length - 1 ? documentOrder[currentIndex + 1] : null;
  $: prevDocument = currentIndex > 0 ? documentOrder[currentIndex - 1] : null;

  // Reactive function that runs when sessionId or documentType changes
  $: if (sessionId && documentType) {
    loadDocument();
  }

  async function loadDocument() {
    isLoading = true;
    error = null;
    
    console.log('Fetching document:', { sessionId, documentType });
    
    // First, try to find the exact document type
    const { data, error: fetchError } = await supabase
      .from('generated_documents')
      .select('document_type, content_html, pdf_url')
      .eq('session_id', sessionId)
      .eq('document_type', documentType);

    console.log('Supabase response:', { data, error: fetchError });

    if (fetchError) {
      console.error('Supabase error:', fetchError);
      error = fetchError.message;
    } else if (data && data.length > 0) {
      // Found the document!
      document = data[0];
      console.log('Document loaded:', document);
    } else {
      // Document not found - let's see what documents ARE available
      console.log('No document found, checking available documents...');
      
      const { data: allDocs, error: allDocsError } = await supabase
        .from('generated_documents')
        .select('document_type')
        .eq('session_id', sessionId);
      
      if (allDocs) {
        availableDocuments = allDocs.map(d => d.document_type);
        console.log('Available documents:', availableDocuments);
      }
      
      document = null;
    }
    
    isLoading = false;
  }

  onMount(() => {
    // Initial load will be handled by the reactive statement
  });
</script>

<div class="max-w-4xl mx-auto p-2">
  {#if isLoading}
    <div class="flex items-center justify-center h-32">
      <p class="text-lg text-gray-600">Loading...</p>
    </div>
  {:else if error}
    <div class="p-4 bg-red-100 text-red-800 rounded-lg">
      <h3 class="font-bold">Error loading document</h3>
      <p>{error}</p>
    </div>
  {:else if document}
    <div class="p-4 border rounded-lg shadow-md bg-white">
      <!-- Remove our heading since the document content has its own -->
      <div class="prose max-w-none document-content">
        {@html document.content_html}
      </div>

      {#if document.pdf_url}
        <div class="mt-4 text-right">
          <a 
            href={document.pdf_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Download PDF
          </a>
        </div>
      {/if}
    </div>

    <div class="flex justify-between mt-6">
      {#if prevDocument}
        <a 
          href={`/results/${sessionId}/${prevDocument}`} 
          class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300"
        >
          ← Previous
        </a>
      {:else}
        <div></div>
      {/if}

      {#if nextDocument}
        <a 
          href={`/results/${sessionId}/${nextDocument}`} 
          class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700"
        >
          Next →
        </a>
      {/if}
    </div>

  {:else}
    <div class="p-4 bg-yellow-100 text-yellow-800 rounded-lg">
      <h3 class="font-bold">Document not found</h3>
      
      {#if availableDocuments.length > 0}
        <p class="mb-2">We couldn't find a document of type "<strong>{documentType}</strong>" for this session.</p>
        <p class="mb-2">Available documents:</p>
        <ul class="list-disc list-inside mb-4">
          {#each availableDocuments as docType}
            <li>
              <a 
                href={`/results/${sessionId}/${docType}`}
                class="text-blue-600 hover:text-blue-800 underline"
              >
                {docType.replace(/_/g, ' ')}
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="mb-2">This part of your analysis is being processed. Please check back in a moment.</p>
      {/if}
      
      <div class="flex gap-2">
        <button 
          onclick={() => window.location.reload()} 
          class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Refresh
        </button>
        
        {#if availableDocuments.length > 0}
          <a 
            href={`/results/${sessionId}/${availableDocuments[0]}`}
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 inline-block"
          >
            Go to first available
          </a>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* Override the document's own CSS styles */
  :global(.document-content body) {
    font-size: 1rem !important;
    margin: 0 !important;
    line-height: 1.6 !important;
  }
  
  :global(.document-content h2) {
    font-size: 1.5rem !important;
    margin-top: 1.5rem !important;
    margin-bottom: 0.75rem !important;
    padding-top: 0 !important;
    padding-bottom: 0.25rem !important;
  }
  
  :global(.document-content h2:first-child) {
    margin-top: 0 !important;
  }
  
  :global(.document-content p) {
    margin-top: 0.5rem !important;
    margin-bottom: 0.5rem !important;
    font-size: 1rem !important;
  }
  
  :global(.document-content table) {
    font-size: 0.9rem !important;
    margin: 1rem 0 !important;
  }
  
  :global(.document-content th), :global(.document-content td) {
    padding: 0.5rem 0.75rem !important;
    font-size: 0.9rem !important;
  }
  
  :global(.document-content .callout) {
    font-size: 0.95rem !important;
    padding: 0.75rem 1rem !important;
    margin: 1rem 0 !important;
  }
  
  :global(.document-content ol), :global(.document-content ul) {
    font-size: 1rem !important;
    margin-bottom: 0.75rem !important;
  }
  
  :global(.document-content li) {
    margin-bottom: 0.25rem !important;
    font-size: 1rem !important;
  }

  /* General prose styling for other content */
  :global(.prose h1), :global(.prose h2), :global(.prose h3) {
    margin-bottom: 0.75rem;
    margin-top: 1rem;
  }
  :global(.prose h1:first-child), :global(.prose h2:first-child), :global(.prose h3:first-child) {
    margin-top: 0;
  }
  :global(.prose p) {
    margin-bottom: 0.75rem;
  }
  :global(.prose ul) {
    list-style-type: disc;
    list-style-position: inside;
    margin-bottom: 0.75rem;
  }
  :global(.prose li) {
    margin-bottom: 0.25rem;
  }
</style>