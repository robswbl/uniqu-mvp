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
  let bulkGivenTo = '';
  let bulkGeneratedCodes: string[] = [];
  let showBulkActions = false;

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
    if (!bulkGivenTo.trim()) {
      message = 'Please enter who the codes were given to.';
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
            given_to: bulkGivenTo.trim() || null 
          })
        });
        const data = await res.json();
        if (!data.success) {
          message = `Failed to mark code ${code} as given out.`;
          messageType = 'error';
          return;
        }
      }

      message = `Marked ${bulkGeneratedCodes.length} codes as given out to: ${bulkGivenTo}`;
      messageType = 'success';
      bulkGeneratedCodes = [];
      showBulkActions = false;
      bulkGivenTo = '';
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
    bulkGivenTo = '';
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
        <h3 class="text-lg font-semibold text-blue-900 mb-4">Bulk Actions for Generated Codes</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-blue-700 mb-2">Generated Codes ({bulkGeneratedCodes.length})</label>
            <div class="bg-white border border-blue-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              {#each bulkGeneratedCodes as code}
                <div class="font-mono text-sm text-blue-800">{code}</div>
              {/each}
            </div>
          </div>
          <div>
            <label for="bulk-given-to" class="block text-sm font-medium text-blue-700 mb-2">Given To (Optional)</label>
            <input 
              id="bulk-given-to"
              type="text" 
              bind:value={bulkGivenTo}
              placeholder="e.g., John Doe, Marketing Team, etc."
              class="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="flex flex-col justify-end space-y-2">
            <button 
              on:click={copyAllCodes}
              class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Copy All Codes
            </button>
            <button 
              on:click={markAllAsGivenOut}
              disabled={markingCode === 'bulk'}
              class="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {markingCode === 'bulk' ? 'Marking...' : 'Mark All as Given Out'}
            </button>
            <button 
              on:click={clearBulkActions}
              class="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    {/if}
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('admin.signup_codes.all_codes')}</h2>
      {#if isLoading}
        <div class="text-gray-500">Loading...</div>
      {:else if codes.length === 0}
        <div class="text-gray-500">No codes found.</div>
      {:else}
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
                         <thead>
               <tr>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{$t('admin.signup_codes.code')}</th>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{$t('admin.signup_codes.status')}</th>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Given Out</th>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Given To</th>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{$t('admin.signup_codes.used_by')}</th>
                 <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{$t('admin.signup_codes.used_at')}</th>
                 <th class="px-4 py-2"></th>
               </tr>
             </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              {#each codes as code}
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
                       <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Given Out</span>
                     {:else}
                       <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Available</span>
                     {/if}
                   </td>
                   <td class="px-4 py-2 text-sm">{code.given_to || '-'}</td>
                   <td class="px-4 py-2 text-sm">{code.used_by || '-'}</td>
                  <td class="px-4 py-2 text-sm">{code.used_at ? new Date(code.used_at).toLocaleString() : '-'}</td>
                  <td class="px-4 py-2">
                    <div class="flex space-x-2">
                      <button on:click={() => copyToClipboard(code.code)} class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs transition-colors">{$t('admin.signup_codes.copy')}</button>
                      {#if !code.used}
                        {#if code.given_out}
                          <button on:click={() => markAsGivenOut(code.code, false)} disabled={markingCode === code.code} class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs transition-colors disabled:opacity-50">Mark Available</button>
                        {:else}
                          <button on:click={() => markAsGivenOut(code.code, true)} disabled={markingCode === code.code} class="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-md text-xs transition-colors disabled:opacity-50">Mark Given Out</button>
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