<script lang="ts">
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabaseClient';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';

  const sessionId = $page.params.sessionId;
  let userData: any = null;
  let isLoading = true;
  let isSaving = false;
  let message = '';
  let messageType = '';

  // Form fields
  let firstName = '';
  let lastName = '';
  let email = '';
  let gender = '';
  let language = '';
  let userSearchRegions = '';
  let userSearchIndustries = '';
  
  // Address fields
  let userStreet = '';
  let userZip = '';
  let userCity = '';
  let userCountry = '';
  let userPhone = '';
  
  // Agency fields
  let agencyId = '';
  let agencyContact = '';

  onMount(async () => {
    try {
      // Get session data to find user_id
      const { data: session, error: sessionError } = await supabase
        .from('questionnaire_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Session not found');
      }

      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_uuid', session.user_id)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      userData = user;
      
      // Populate form fields with correct column names
      firstName = user.user_firstname || '';
      lastName = user.user_lastname || '';
      email = user.user_email || '';
      gender = user.user_gender || '';
      language = user.user_language || '';
      userSearchRegions = user.user_search_regions || '';
      userSearchIndustries = user.user_search_industries || '';
      
      // Address fields
      userStreet = user.user_street || '';
      userZip = user.user_zip || '';
      userCity = user.user_city || '';
      userCountry = user.user_country || '';
      userPhone = user.user_phone || '';
      
      // Agency fields
      agencyId = user.agency_id || '';
      agencyContact = user.agency_contact || '';

    } catch (error) {
      console.error('Error loading profile:', error);
      message = 'Error loading profile data';
      messageType = 'error';
    } finally {
      isLoading = false;
    }
  });

  async function saveProfile() {
    if (!userData) return;

    isSaving = true;
    message = '';

    try {
      const { error } = await supabase
        .from('users')
        .update({
          user_firstname: firstName,
          user_lastname: lastName,
          user_email: email,
          user_gender: gender,
          user_language: language,
          user_search_regions: userSearchRegions,
          user_search_industries: userSearchIndustries,
          user_street: userStreet,
          user_zip: userZip,
          user_city: userCity,
          user_country: userCountry,
          user_phone: userPhone,
          agency_id: agencyId || null,
          agency_contact: agencyContact
        })
        .eq('user_uuid', userData.user_uuid);

      if (error) {
        throw error;
      }

      message = $t('profile.saved_successfully');
      messageType = 'success';
      
      // Update local userData
      userData = {
        ...userData,
        user_firstname: firstName,
        user_lastname: lastName,
        user_email: email,
        user_gender: gender,
        user_language: language,
        user_search_regions: userSearchRegions,
        user_search_industries: userSearchIndustries,
        user_street: userStreet,
        user_zip: userZip,
        user_city: userCity,
        user_country: userCountry,
        user_phone: userPhone,
        agency_id: agencyId,
        agency_contact: agencyContact
      };

    } catch (error) {
      console.error('Error saving profile:', error);
      message = $t('profile.save_error');
      messageType = 'error';
    } finally {
      isSaving = false;
    }
  }

  function goBack() {
    goto(`/dashboard/${sessionId}`);
  }
</script>

<svelte:head>
  <title>{$t('profile.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-4xl mx-auto">
    
    <!-- Header -->
    <div class="mb-8">
      <button 
        on:click={goBack}
        class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
        type="button"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {$t('profile.back_to_dashboard')}
      </button>
      
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('profile.heading')}</h1>
      <p class="text-gray-600">{$t('profile.subheading')}</p>
    </div>

    {#if isLoading}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">{$t('profile.loading')}</p>
      </div>
    {:else if userData}
      <!-- Profile Form -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <form on:submit|preventDefault={saveProfile} class="space-y-6">
          
          <!-- Message Display -->
          {#if message}
            <div class="p-4 rounded-lg {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">
              {message}
            </div>
          {/if}

          <!-- Personal Information Section -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('profile.personal_information')}</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <!-- First Name -->
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.first_name_label')} *
                </label>
                <input
                  id="firstName"
                  type="text"
                  bind:value={firstName}
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.first_name_placeholder')}
                />
              </div>

              <!-- Last Name -->
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.last_name_label')} *
                </label>
                <input
                  id="lastName"
                  type="text"
                  bind:value={lastName}
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.last_name_placeholder')}
                />
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.email_label')} *
                </label>
                <input
                  id="email"
                  type="email"
                  bind:value={email}
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.email_placeholder')}
                />
              </div>

              <!-- Gender -->
              <div>
                <label for="gender" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.gender_label')} *
                </label>
                <select
                  id="gender"
                  bind:value={gender}
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="">{$t('profile.gender_select')}</option>
                  <option value="male">{$t('profile.gender_male')}</option>
                  <option value="female">{$t('profile.gender_female')}</option>
                </select>
              </div>

              <!-- Phone -->
              <div>
                <label for="userPhone" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.phone_label')}
                </label>
                <input
                  id="userPhone"
                  type="tel"
                  bind:value={userPhone}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.phone_placeholder')}
                />
              </div>
            </div>
          </div>

          <!-- Address Section -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('profile.address_information')}</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Street -->
              <div>
                <label for="userStreet" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.street_label')}
                </label>
                <input
                  id="userStreet"
                  type="text"
                  bind:value={userStreet}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.street_placeholder')}
                />
              </div>

              <!-- ZIP -->
              <div>
                <label for="userZip" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.zip_label')}
                </label>
                <input
                  id="userZip"
                  type="text"
                  bind:value={userZip}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.zip_placeholder')}
                />
              </div>

              <!-- City -->
              <div>
                <label for="userCity" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.city_label')}
                </label>
                <input
                  id="userCity"
                  type="text"
                  bind:value={userCity}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.city_placeholder')}
                />
              </div>

              <!-- Country -->
              <div>
                <label for="userCountry" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.country_label')}
                </label>
                <input
                  id="userCountry"
                  type="text"
                  bind:value={userCountry}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.country_placeholder')}
                />
              </div>
            </div>
          </div>

          <!-- Preferences Section -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('profile.preferences')}</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <!-- Language -->
              <div>
                <label for="language" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.language_label')} *
                </label>
                <select
                  id="language"
                  bind:value={language}
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  <option value="">{$t('profile.language_select')}</option>
                  <option value="en">{$t('profile.language_english')}</option>
                  <option value="de">{$t('profile.language_german')}</option>
                  <option value="fr">{$t('profile.language_french')}</option>
                  <option value="it">{$t('profile.language_italian')}</option>
                  <option value="es">{$t('profile.language_spanish')}</option>
                </select>
              </div>

              <!-- Agency Contact -->
              <div>
                <label for="agencyContact" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.agency_contact_label')}
                </label>
                <input
                  id="agencyContact"
                  type="text"
                  bind:value={agencyContact}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.agency_contact_placeholder')}
                />
              </div>
            </div>
          </div>

          <!-- Job Search Preferences Section -->
          <div class="border-b border-gray-200 pb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('profile.job_search_preferences')}</h2>
            
            <div class="space-y-6">
              <!-- Search Regions -->
              <div>
                <label for="userSearchRegions" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.search_regions_label')}
                </label>
                <input
                  id="userSearchRegions"
                  type="text"
                  bind:value={userSearchRegions}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.search_regions_placeholder')}
                />
                <p class="text-sm text-gray-500 mt-1">{$t('profile.search_regions_help')}</p>
              </div>

              <!-- Search Industries -->
              <div>
                <label for="userSearchIndustries" class="block text-sm font-medium text-gray-700 mb-2">
                  {$t('profile.search_industries_label')}
                </label>
                <input
                  id="userSearchIndustries"
                  type="text"
                  bind:value={userSearchIndustries}
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder={$t('profile.search_industries_placeholder')}
                />
                <p class="text-sm text-gray-500 mt-1">{$t('profile.search_industries_help')}</p>
              </div>
            </div>
          </div>

          <!-- Account Information Section -->
          <div class="pb-6">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('profile.account_information')}</h2>
            
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-gray-700">{$t('profile.user_id')}:</span>
                  <span class="text-gray-600 ml-2 font-mono">{userData.user_uuid}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">{$t('profile.created_at')}:</span>
                  <span class="text-gray-600 ml-2">
                    {userData.created_at ? new Date(userData.created_at).toLocaleDateString() : $t('profile.not_available')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSaving}
              class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if isSaving}
                <div class="flex items-center justify-center">
                  <div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {$t('profile.saving')}
                </div>
              {:else}
                {$t('profile.save_changes')}
              {/if}
            </button>
            
            <button
              type="button"
              on:click={goBack}
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
            >
              {$t('profile.cancel')}
            </button>
          </div>
        </form>
      </div>
    {:else}
      <div class="bg-white rounded-xl shadow-lg p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-800 mb-2">{$t('profile.error_loading')}</h3>
        <p class="text-gray-600 mb-4">{$t('profile.error_loading_description')}</p>
        <button 
          on:click={goBack}
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
        >
          {$t('profile.back_to_dashboard')}
        </button>
      </div>
    {/if}
  </div>
</div> 