<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { t } from 'svelte-i18n';
  // Remove import { t as $t } from 'svelte-i18n';

  let sessionId = $page.params.sessionId;
  let documents: any[] = [];
  let loading = true;
  let error: string | null = null;

  // Filtering and sorting
  let filterType: string = 'all';
  let sortBy: string = 'created_at';
  let sortAsc: boolean = false;

  // For versioning
  const mainTypes = ['reflection_letter', 'career_themes', 'ideal_companies'];
  const applicationLetterType = 'application_letter';

  // Compute version numbers for main docs
  function getVersion(doc: any, docs: any[]) {
    if (!mainTypes.includes(doc.document_type)) return '';
    // Get all docs of this type, sorted oldest to newest
    const docsOfType = docs
      .filter(d => d.document_type === doc.document_type)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const idx = docsOfType.findIndex(d => d.id === doc.id);
    return idx >= 0 ? `v${idx + 1}` : '';
  }

  // Filtering
  function filteredDocs() {
    let filtered = documents;
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === filterType);
    }
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'company_name') {
        aVal = a.company_name || '';
        bVal = b.company_name || '';
      } else if (sortBy === 'version') {
        aVal = getVersion(a, documents);
        bVal = getVersion(b, documents);
      } else {
        aVal = a[sortBy];
        bVal = b[sortBy];
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return filtered;
  }

  function setSort(col: string) {
    if (sortBy === col) {
      sortAsc = !sortAsc;
    } else {
      sortBy = col;
      sortAsc = true;
    }
  }

  async function fetchDocuments() {
    try {
      loading = true;
      const { data, error: fetchError } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      let docs = data || [];

      // --- Frontend join: fetch application_letters and merge company_name ---
      const { data: letters } = await supabase
        .from('application_letters')
        .select('id, company_name, session_id');
      docs = docs.map(doc => {
        if (doc.document_type === applicationLetterType) {
          // Try to match by document_id or session_id (adjust as needed)
          const letter = letters?.find(l => l.session_id === doc.session_id && l.company_name);
          return { ...doc, company_name: letter?.company_name || '-' };
        }
        return doc;
      });
      documents = docs;
      // --- END Frontend join ---
      // TODO: For best performance, update n8n to always write company_name into generated_documents for application_letter type.
    } catch (err: any) {
      error = err?.message || 'Failed to load documents';
    } finally {
      loading = false;
    }
  }

  function openDocument(doc: any) {
    goto(`/results/${sessionId}/${doc.document_type}`);
  }

  function downloadDocument(doc: any) {
    if (doc.pdf_url) {
      window.open(doc.pdf_url, '_blank');
    } else if (doc.content_html) {
      const blob = new Blob([doc.content_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.document_type.replace('_', '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert('No downloadable content available.');
    }
  }

  onMount(() => {
    fetchDocuments();
  });

  // Remove any $: $t = t; assignment
  // Use {$t('key')} in markup
</script>

<svelte:head>
  <title>{$t('all_documents.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-5xl mx-auto">
    <div class="mb-8 flex items-center justify-between flex-wrap gap-2">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('all_documents.heading')}</h1>
        <p class="text-gray-600">{$t('all_documents.subheading')}</p>
      </div>
      <div class="flex items-center gap-4 flex-wrap">
        <label for="filter-type-select" class="text-sm text-gray-700">{$t('all_documents.filter_by_type')}</label>
        <select id="filter-type-select" bind:value={filterType} class="p-2 border rounded">
          <option value="all">{$t('all_documents.all')}</option>
          <option value="reflection_letter">{$t('all_documents.reflection_letter')}</option>
          <option value="career_themes">{$t('all_documents.career_themes')}</option>
          <option value="ideal_companies">{$t('all_documents.ideal_companies')}</option>
          <option value="application_letter">{$t('all_documents.application_letter')}</option>
        </select>
        <button on:click={() => goto(`/dashboard/${sessionId}`)} class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200" type="button">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {$t('all_documents.back_to_dashboard')}
        </button>
      </div>
    </div>

    {#if loading}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">{$t('all_documents.loading')}</p>
      </div>
    {:else if error}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <p class="text-red-600">{error}</p>
      </div>
    {:else if filteredDocs().length === 0}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <p class="text-gray-600">{$t('all_documents.no_documents')}</p>
      </div>
    {:else}
      <div class="bg-white rounded-xl shadow-lg p-8 overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => setSort('document_type')}>{$t('all_documents.type')} {sortBy === 'document_type' ? (sortAsc ? '▲' : '▼') : ''}</th>
              {#if filterType === applicationLetterType || filterType === 'all'}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => setSort('company_name')}>{$t('all_documents.company')} {sortBy === 'company_name' ? (sortAsc ? '▲' : '▼') : ''}</th>
              {/if}
              {#if filterType === 'all' || mainTypes.includes(filterType)}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => setSort('version')}>{$t('all_documents.version')} {sortBy === 'version' ? (sortAsc ? '▲' : '▼') : ''}</th>
              {/if}
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" on:click={() => setSort('created_at')}>{$t('all_documents.timestamp')} {sortBy === 'created_at' ? (sortAsc ? '▲' : '▼') : ''}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('all_documents.open')}</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{$t('all_documents.download')}</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each filteredDocs() as doc}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.document_type.replace('_', ' ') === 'application letter' ? $t('all_documents.application_letter') : $t(`all_documents.${doc.document_type}`)}</td>
                {#if (filterType === applicationLetterType || filterType === 'all')}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{doc.document_type === applicationLetterType ? doc.company_name || '-' : ''}</td>
                {/if}
                {#if (filterType === 'all' || mainTypes.includes(filterType))}
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{mainTypes.includes(doc.document_type) ? getVersion(doc, documents) : ''}</td>
                {/if}
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(doc.created_at).toLocaleString()}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button on:click={() => openDocument(doc)} class="text-indigo-600 hover:text-indigo-800 font-medium underline">{$t('all_documents.open')}</button>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button on:click={() => downloadDocument(doc)} class="text-green-600 hover:text-green-800 font-medium underline">{$t('all_documents.download')}</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div> 