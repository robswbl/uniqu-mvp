<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  let codes: any[] = [];
  let isLoading = false;
  let isGenerating = false;
  let count = 1;
  let message = '';
  let messageType = '';
  let markingCode = '';
  let bulkGivenBy = '';
  let bulkGeneratedCodes: string[] = [];
  let showBulkActions = false;

  // Sorting and filtering state
  let sortField = 'code';
  let sortDirection = 'asc';
  let statusFilter = 'all';
  let givenOutFilter = 'all';
  let searchTerm = '';

  // Computed filtered and sorted codes
  $: filteredCodes = codes.filter(code => {
    // Status filter
    if (statusFilter === 'used' && !code.used) return false;
    if (statusFilter === 'unused' && code.used) return false;
    
    // Given out filter
    if (givenOutFilter === 'given_out' && !code.given_out) return false;
    if (givenOutFilter === 'available' && code.given_out) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        code.code.toLowerCase().includes(searchLower) ||
        (code.given_by && code.given_by.toLowerCase().includes(searchLower)) ||
        (code.used_by && code.used_by.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  $: sortedCodes = [...filteredCodes].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle special cases
    if (sortField === 'used_at') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    
    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';
    
    // Convert to strings for comparison
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    
    if (sortDirection === 'asc') {
      return aVal.localeCompare(bVal);
    } else {
      return bVal.localeCompare(aVal);
    }
  });

  function sortBy(field: string) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  function clearFilters() {
    statusFilter = 'all';
    givenOutFilter = 'all';
    searchTerm = '';
  }

  async function fetchCodes() {
    isLoading = true;
    message = '';
    try {
      const res = await fetch('/api/signup-codes');
      const data = await res.json();
      if (data.codes) {
        codes = data.codes;
      } else {
        message = data.error || 'Failed to load codes.';
        messageType = 'error';
      }
    } catch (err: any) {
      message = err.message || 'Failed to load codes.';
      messageType = 'error';
    } finally {
      isLoading = false;
    }
  }

  async function generateCodes() {
    if (!count || count < 1) return;
    isGenerating = true;
    message = '';
    try {
      const res = await fetch('/api/signup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      const data = await res.json();
      if (data.codes) {
        bulkGeneratedCodes = data.codes;
        showBulkActions = true;
        message = `Generated ${data.codes.length} code(s). You can now copy them all and mark them as given out.`;
        messageType = 'success';
        await fetchCodes();
      } else {
        message = data.error || 'Failed to generate codes.';
        messageType = 'error';
      }
    } catch (err: any) {
      message = err.message || 'Failed to generate codes.';
      messageType = 'error';
    } finally {
      isGenerating = false;
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code);
    message = `Copied code: ${code}`;
    messageType = 'success';
  }

  async function markAsGivenOut(code: string, given_out: boolean) {
    markingCode = code;
    try {
      const res = await fetch('/api/signup-codes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, given_out })
      });
      const data = await res.json();
      if (data.success) {
        message = `Code ${code} marked as ${given_out ? 'given out' : 'not given out'}.`;
        messageType = 'success';
        await fetchCodes();
      } else {
        message = data.error || 'Failed to update code status.';
        messageType = 'error';
      }
    } catch (err: any) {
      message = err.message || 'Failed to update code status.';
      messageType = 'error';
    } finally {
      markingCode = '';
    }
  }

  function copyAllCodes() {
    const codesText = bulkGeneratedCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    message = `Copied ${bulkGeneratedCodes.length} codes to clipboard.`;
    messageType = 'success';
  }

  async function markAllAsGivenOut() {
    if (!bulkGivenBy.trim()) {
      message = 'Please enter who gave out the codes.';
      messageType = 'error';
      return;
    }

    markingCode = 'bulk';
    try {
      // Mark each code as given out
      for (const code of bulkGeneratedCodes) {
        const res = await fetch('/api/signup-codes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code, 
            given_out: true, 
            given_by: bulkGivenBy.trim() || null 
          })
        });
        const data = await res.json();
        if (!data.success) {
          message = `Failed to mark code ${code} as given out.`;
          messageType = 'error';
          return;
        }
      }

      message = `Marked ${bulkGeneratedCodes.length} codes as given out by: ${bulkGivenBy}`;
      messageType = 'success';
      bulkGeneratedCodes = [];
      showBulkActions = false;
      bulkGivenBy = '';
      await fetchCodes();
    } catch (err: any) {
      message = err.message || 'Failed to mark codes as given out.';
      messageType = 'error';
    } finally {
      markingCode = '';
    }
  }

  function clearBulkActions() {
    bulkGeneratedCodes = [];
    showBulkActions = false;
    bulkGivenBy = '';
    message = '';
  }

  onMount(fetchCodes);
</script>

<svelte:head>
  <title>Signup Code Management</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-6xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('admin.signup_codes.heading')}</h1>
      <p class="text-gray-600">{$t('admin.signup_codes.subheading')}</p>
    </div>
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
      <form on:submit|preventDefault={generateCodes} class="flex flex-col md:flex-row items-center gap-4">
        <label for="count" class="block text-sm font-medium text-gray-700">{$t('admin.signup_codes.count_label')}</label>
        <input id="count" type="number" min="1" bind:value={count} class="w-24 px-4 py-2 border border-gray-300 rounded-lg" />
        <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300" disabled={isGenerating}>
          {isGenerating ? $t('admin.signup_codes.generating') : $t('admin.signup_codes.generate')}
        </button>
      </form>
      {#if message}
        <div class="mt-4 p-3 rounded-lg {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">{message}</div>
      {/if}
    </div>

    <!-- Bulk Actions Section -->
    {#if showBulkActions}
      <div class="bg-blue-50 rounded-xl shadow-lg border border-blue-200 p-6 mb-8">
        <h3 class="text-lg font-semibold text-blue-900 mb-4">{$t('admin.signup_codes.bulk_actions_title')}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">{$t('admin.signup_codes.generated_codes')} ({bulkGeneratedCodes.length})</label>
            <div class="bg-white border border-blue-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              {#each bulkGeneratedCodes as code}
                <div class="font-mono text-sm text-blue-800">{code}</div>
              {/each}
            </div>
          </div>
          <div>
            <label for="bulk-given-by" class="block text-sm font-medium text-blue-700 mb-2">{$t('admin.signup_codes.given_by_label')}</label>
            <input 
              id="bulk-given-by"
              type="text" 
              bind:value={bulkGivenBy}
              placeholder="{$t('admin.signup_codes.given_by_placeholder')}"
              class="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="flex flex-col justify-end space-y-2">
            <button 
              on:click={copyAllCodes}
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {$t('admin.signup_codes.copy_all_codes')}
            </button>
            <button 
              on:click={markAllAsGivenOut}
              disabled={markingCode === 'bulk'}
              class="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {markingCode === 'bulk' ? $t('admin.signup_codes.marking') : $t('admin.signup_codes.mark_all_given_out')}
            </button>
            <button 
              on:click={clearBulkActions}
              class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {$t('admin.signup_codes.clear')}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 class="text-xl font-semibold text-gray-800">{$t('admin.signup_codes.all_codes')}</h2>
        
        <!-- Filters and Search -->
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <!-- Search -->
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="{$t('admin.signup_codes.search_placeholder')}"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          <!-- Status Filter -->
          <select bind:value={statusFilter} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="all">{$t('admin.signup_codes.all_status')}</option>
            <option value="used">{$t('admin.signup_codes.used')}</option>
            <option value="unused">{$t('admin.signup_codes.unused')}</option>
          </select>
          
          <!-- Given Out Filter -->
          <select bind:value={givenOutFilter} class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="all">{$t('admin.signup_codes.all_distribution')}</option>
            <option value="given_out">{$t('admin.signup_codes.given_out')}</option>
            <option value="available">{$t('admin.signup_codes.available')}</option>
          </select>
          
          <!-- Clear Filters -->
          <button
            on:click={clearFilters}
            class="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            {$t('admin.signup_codes.clear_filters')}
          </button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="mb-4 text-sm text-gray-600">
        Showing {sortedCodes.length} of {codes.length} codes
      </div>

      {#if isLoading}
        <div class="text-gray-500">Loading...</div>
      {:else if codes.length === 0}
        <div class="text-gray-500">No codes found.</div>
      {:else if sortedCodes.length === 0}
        <div class="text-gray-500">{$t('admin.signup_codes.no_codes_match')}</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('code')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.code')} {getSortIcon('code')}
                  </div>
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('used')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.status')} {getSortIcon('used')}
                  </div>
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('given_out')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.given_out')} {getSortIcon('given_out')}
                  </div>
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('given_by')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.given_by')} {getSortIcon('given_by')}
                  </div>
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('used_by')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.used_by')} {getSortIcon('used_by')}
                  </div>
                </th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-50" on:click={() => sortBy('used_at')}>
                  <div class="flex items-center gap-1">
                    {$t('admin.signup_codes.used_at')} {getSortIcon('used_at')}
                  </div>
                </th>
                <th class="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              {#each sortedCodes as code}
                <tr>
                  <td class="px-4 py-2 font-mono text-sm">{code.code}</td>
                  <td class="px-4 py-2">
                    {#if code.used}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Used</span>
                    {:else}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Unused</span>
                    {/if}
                  </td>
                  <td class="px-4 py-2">
                    {#if code.given_out}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">{$t('admin.signup_codes.given_out')}</span>
                    {:else}
                      <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{$t('admin.signup_codes.available')}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-2 text-sm">{code.given_by || '-'}</td>
                  <td class="px-4 py-2 text-sm">{code.used_by || '-'}</td>
                  <td class="px-4 py-2 text-sm">{code.used_at ? new Date(code.used_at).toLocaleString() : '-'}</td>
                  <td class="px-4 py-2">
                    <div class="flex space-x-2">
                      <button on:click={() => copyToClipboard(code.code)} class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs transition-colors">{$t('admin.signup_codes.copy')}</button>
                      {#if !code.used}
                        {#if code.given_out}
                          <button on:click={() => markAsGivenOut(code.code, false)} disabled={markingCode === code.code} class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs transition-colors disabled:opacity-50">{$t('admin.signup_codes.mark_available')}</button>
                        {:else}
                          <button on:click={() => markAsGivenOut(code.code, true)} disabled={markingCode === code.code} class="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-md text-xs transition-colors disabled:opacity-50">{$t('admin.signup_codes.mark_given_out')}</button>
                        {/if}
                      {/if}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
</div> 