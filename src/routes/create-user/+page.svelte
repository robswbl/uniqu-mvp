<!-- src/routes/create-user/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';

  let firstName = '';
  let lastName = '';
  let gender = '';
  let email = '';
  let language = '';
  let agency = '';
  let isSubmitting = false;
  let message = '';
  let messageType = '';

  async function createUser() {
    if (!firstName || !lastName || !gender || !email || !language || !agency) {
      message = 'Please fill in all fields';
      messageType = 'error';
      return;
    }

    isSubmitting = true;
    message = '';

    try {
      const userData = {
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
        message = 'User created successfully!';
        messageType = 'success';
        // Clear form
        firstName = '';
        lastName = '';
        gender = '';
        email = '';
        language = '';
        agency = '';
      } else {
        message = 'Failed to create user. Please try again.';
        messageType = 'error';
      }
    } catch (error) {
      console.error('Error creating user:', error);
      message = 'Error creating user. Please try again.';
      messageType = 'error';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Create User - Internal Testing</title>
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
        Back to Home
      </button>
      
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Create New User</h1>
      <p class="text-gray-600">Internal testing tool for creating new users</p>
    </div>

    <!-- Form -->
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <form on:submit|preventDefault={createUser} class="space-y-6">
        
        <!-- First Name -->
        <div>
          <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            id="firstName"
            type="text"
            bind:value={firstName}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter first name"
          />
        </div>

        <!-- Last Name -->
        <div>
          <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            id="lastName"
            type="text"
            bind:value={lastName}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter last name"
          />
        </div>

        <!-- Gender -->
        <div>
          <label for="gender" class="block text-sm font-medium text-gray-700 mb-2">
            Gender *
          </label>
          <select
            id="gender"
            bind:value={gender}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter email address"
          />
        </div>

        <!-- Language -->
        <div>
          <label for="language" class="block text-sm font-medium text-gray-700 mb-2">
            Language *
          </label>
          <select
            id="language"
            bind:value={language}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="">Select language</option>
            <option value="English">English</option>
            <option value="German">German</option>
          </select>
        </div>

        <!-- Agency -->
        <div>
          <label for="agency" class="block text-sm font-medium text-gray-700 mb-2">
            Agency *
          </label>
          <input
            id="agency"
            type="text"
            bind:value={agency}
            required
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            placeholder="Enter agency name"
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
            Creating User...
          {:else}
            Create User
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
          <h3 class="text-sm font-medium text-blue-900">Internal Testing Tool</h3>
          <p class="text-sm text-blue-700 mt-1">
            This form sends user data to the n8n webhook for database creation. For internal testing purposes only.
          </p>
        </div>
      </div>
    </div>
  </div>
</div> 