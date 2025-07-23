<!-- src/routes/create-user/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';

  let firstName = '';
  let lastName = '';
  let gender = '';
  let email = '';
  let language = '';
  let agency = '';
  let isSubmitting = false;
  let message = '';
  let messageType = '';

  // Generate UUID function
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function createUser() {
    if (!firstName || !lastName || !gender || !email || !language || !agency) {
      message = $t('create_user.fill_all_fields');
      messageType = 'error';
      return;
    }

    isSubmitting = true;
    message = '';

    try {
      const userData = {
        uuid: generateUUID(),
        firstName,
        lastName,
        gender,
        email,
        language,
        agency
      };

      const response = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-createuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        message = $t('create_user.success');
        messageType = 'success';
        // Clear form
        firstName = '';
        lastName = '';
        gender = '';
        email = '';
        language = '';
        agency = '';
      } else {
        message = $t('create_user.fail');
        messageType = 'error';
      }
    } catch (error) {
      console.error('Error creating user:', error);
      message = $t('create_user.error');
      messageType = 'error';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('create_user.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-2xl mx-auto">
    
    <!-- Header -->
    <div class="mb-8">
      <button 
        on:click={() => goto('/')}
        class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
        type="button"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {$t('create_user.back_to_home')}
      </button>
      
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('create_user.heading')}</h1>
      <p class="text-gray-600">{$t('create_user.subheading')}</p>
    </div>

    <!-- Form -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <form on:submit|preventDefault={createUser} class="space-y-6">
        
        <!-- First Name -->
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.first_name_label')} *
          </label>
          <input
            id="firstName"
            type="text"
            bind:value={firstName}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder={$t('create_user.first_name_placeholder')}
          />
        </div>

        <!-- Last Name -->
        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.last_name_label')} *
          </label>
          <input
            id="lastName"
            type="text"
            bind:value={lastName}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder={$t('create_user.last_name_placeholder')}
          />
        </div>

        <!-- Gender -->
        <div>
          <label for="gender" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.gender_label')} *
          </label>
          <select
            id="gender"
            bind:value={gender}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="">{$t('create_user.gender_select')}</option>
            <option value="male">{$t('create_user.gender_male')}</option>
            <option value="female">{$t('create_user.gender_female')}</option>
          </select>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.email_label')} *
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder={$t('create_user.email_placeholder')}
          />
        </div>

        <!-- Language -->
        <div>
          <label for="language" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.language_label')} *
          </label>
          <select
            id="language"
            bind:value={language}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="">{$t('create_user.language_select')}</option>
            <option value="English">{$t('create_user.language_english')}</option>
            <option value="German">{$t('create_user.language_german')}</option>
          </select>
        </div>

        <!-- Agency -->
        <div>
          <label for="agency" class="block text-sm font-medium text-gray-700 mb-2">
            {$t('create_user.agency_label')} *
          </label>
          <input
            id="agency"
            type="text"
            bind:value={agency}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder={$t('create_user.agency_placeholder')}
          />
        </div>

        <!-- Message -->
        {#if message}
          <div class="p-4 rounded-lg {messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}">
            {message}
          </div>
        {/if}

        <!-- Submit Button -->
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {#if isSubmitting}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {$t('create_user.creating')}
          {:else}
            {$t('create_user.create')}
          {/if}
        </button>
      </form>
    </div>

    <!-- Info Box -->
    <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start">
        <svg class="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="text-sm font-medium text-blue-900">{$t('create_user.info_title')}</h3>
          <p class="text-sm text-blue-700 mt-1">
            {$t('create_user.info_desc')}
          </p>
        </div>
      </div>
    </div>
  </div>
</div> 