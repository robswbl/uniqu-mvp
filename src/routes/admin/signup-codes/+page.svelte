<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from 'svelte-i18n';
  let codes: any[] = [];
  let isLoading = false;
  let isGenerating = false;
  let count = 1;
  let message = '';
  let messageType = '';

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
        message = `Generated ${data.codes.length} code(s).`;
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

  onMount(fetchCodes);
</script>

<svelte:head>
  <title>Signup Code Management</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-3xl mx-auto">
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
                  <td class="px-4 py-2 text-sm">{code.used_by || '-'}</td>
                  <td class="px-4 py-2 text-sm">{code.used_at ? new Date(code.used_at).toLocaleString() : '-'}</td>
                  <td class="px-4 py-2">
                    <button on:click={() => copyToClipboard(code.code)} class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-xs transition-colors">{$t('admin.signup_codes.copy')}</button>
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