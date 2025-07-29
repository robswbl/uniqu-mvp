<script lang="ts">
  import { t } from 'svelte-i18n';
  let password = '';
  let unlocked = false;
  let error = '';

  function checkPassword() {
    if (password === 'Konrad1982') {
      unlocked = true;
      error = '';
    } else {
      error = 'Incorrect password.';
      unlocked = false;
    }
  }
</script>

<svelte:head>
  <title>Admin Tools</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('admin.nav.heading')}</h1>
      <p class="text-gray-600">{$t('admin.nav.subheading')}</p>
    </div>
    {#if !unlocked}
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 flex flex-col items-center max-w-md mx-auto">
        <label for="admin-password" class="block text-sm font-medium text-gray-700 mb-2 w-full max-w-md">{$t('admin.nav.password_label')}</label>
        <input id="admin-password" type="password" bind:value={password} class="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg mb-4" on:keydown={(e) => e.key === 'Enter' && checkPassword()} />
        <button type="button" class="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300" on:click={checkPassword}>{$t('admin.nav.unlock')}</button>
        {#if error}
          <div class="mt-4 p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 w-full max-w-md">{$t('admin.nav.incorrect_password')}</div>
        {/if}
      </div>
    {:else}
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md mx-auto">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('admin.nav.pages')}</h2>
        <ul class="space-y-4">
          <li><a href="/admin/signup-codes" class="text-indigo-700 hover:underline font-medium">{$t('admin.nav.signup_codes')}</a></li>
          <li><a href="/admin/assign-agency" class="text-indigo-700 hover:underline font-medium">{$t('admin.nav.assign_agency')}</a></li>
          <li><a href="/admin/question-order" class="text-indigo-700 hover:underline font-medium">{$t('admin.nav.question_order')}</a></li>
        </ul>
      </div>
    {/if}
  </div>
</div> 