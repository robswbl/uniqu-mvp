<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';
  import bcrypt from 'bcryptjs';
  import { v4 as uuidv4 } from 'uuid';

  // Form fields
  let firstName = '';
  let lastName = '';
  let email = '';
  let gender = '';
  let language = '';
  let userSearchRegions = '';
  let userSearchIndustries = '';
  let userStreet = '';
  let userZip = '';
  let userCity = '';
  let userCountry = '';
  let userPhone = '';
  let password = '';
  let confirmPassword = '';
  let signupCode = '';

  let isSubmitting = false;
  let message = '';
  let messageType = '';

  async function handleSignup() {
    isSubmitting = true;
    message = '';
    messageType = '';
    try {
      // 1. Validate signup code
      const { data: codeData, error: codeError } = await supabase
        .from('signup_codes')
        .select('*')
        .eq('code', signupCode)
        .eq('used', false)
        .single();
      if (codeError || !codeData) {
        message = 'Invalid or already used signup code.';
        messageType = 'error';
        isSubmitting = false;
        return;
      }

      // 2. Check password match
      if (password !== confirmPassword) {
        message = 'Passwords do not match.';
        messageType = 'error';
        isSubmitting = false;
        return;
      }
      if (password.length < 6) {
        message = 'Password must be at least 6 characters.';
        messageType = 'error';
        isSubmitting = false;
        return;
      }

      // 3. Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // 4. Generate user_uuid
      const user_uuid = uuidv4();

      // 5. Insert user into users table
      const { error: userError } = await supabase.from('users').insert({
        user_uuid,
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
        password_hash
      });
      if (userError) {
        message = userError.message;
        messageType = 'error';
        isSubmitting = false;
        return;
      }

      // 5b. Create questionnaire session for the new user
      const { error: sessionError } = await supabase
        .from('questionnaire_sessions')
        .insert({ user_id: user_uuid, status: 'in-progress', created_at: new Date().toISOString() });
      if (sessionError) {
        message = 'User created, but failed to create session.';
        messageType = 'error';
        isSubmitting = false;
        return;
      }

      // 6. Mark code as used
      await supabase
        .from('signup_codes')
        .update({ used: true, used_by: email, used_at: new Date().toISOString() })
        .eq('code', signupCode);

      message = 'Signup successful!';
      messageType = 'success';
      setTimeout(() => goto('/'), 2000);
    } catch (err: any) {
      message = err.message || 'Signup failed.';
      messageType = 'error';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head>
  <title>Signup</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
  <div class="max-w-2xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('signup.heading')}</h1>
      <p class="text-gray-600">{$t('signup.subheading')}</p>
    </div>
    <div class="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <form on:submit|preventDefault={handleSignup} class="space-y-6">
        {#if message}
          <div class="p-4 rounded-lg {messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}">{message}</div>
        {/if}
        <div class="grid md:grid-cols-2 gap-6">
          <div><label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.first_name_label')} *</label><input id="firstName" type="text" bind:value={firstName} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.last_name_label')} *</label><input id="lastName" type="text" bind:value={lastName} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="email" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.email_label')} *</label><input id="email" type="email" bind:value={email} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="gender" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.gender_label')} *</label><select id="gender" bind:value={gender} required class="w-full px-4 py-3 border border-gray-300 rounded-lg"><option value="">{$t('signup.gender_select')}</option><option value="male">{$t('signup.gender_male')}</option><option value="female">{$t('signup.gender_female')}</option></select></div>
          <div><label for="userPhone" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.phone_label')}</label><input id="userPhone" type="tel" bind:value={userPhone} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div><label for="userStreet" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.street_label')}</label><input id="userStreet" type="text" bind:value={userStreet} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="userZip" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.zip_label')}</label><input id="userZip" type="text" bind:value={userZip} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="userCity" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.city_label')}</label><input id="userCity" type="text" bind:value={userCity} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="userCountry" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.country_label')}</label><input id="userCountry" type="text" bind:value={userCountry} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div><label for="language" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.language_label')} *</label><select id="language" bind:value={language} required class="w-full px-4 py-3 border border-gray-300 rounded-lg"><option value="">{$t('signup.language_select')}</option><option value="en">{$t('signup.language_english')}</option><option value="de">{$t('signup.language_german')}</option><option value="fr">{$t('signup.language_french')}</option><option value="it">{$t('signup.language_italian')}</option><option value="es">{$t('signup.language_spanish')}</option></select></div>
          <div><label for="userSearchRegions" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.search_regions_label')}</label><input id="userSearchRegions" type="text" bind:value={userSearchRegions} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="userSearchIndustries" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.search_industries_label')}</label><input id="userSearchIndustries" type="text" bind:value={userSearchIndustries} class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <div><label for="password" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.password_label')} *</label><input id="password" type="password" bind:value={password} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label><input id="confirmPassword" type="password" bind:value={confirmPassword} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
          <div><label for="signupCode" class="block text-sm font-medium text-gray-700 mb-2">{$t('signup.signup_code_label')} *</label><input id="signupCode" type="text" bind:value={signupCode} required class="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
        </div>
        <div class="flex justify-end pt-4">
          <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300" disabled={isSubmitting}>
            {isSubmitting ? $t('signup.signing_up') : $t('signup.sign_up')}
          </button>
        </div>
      </form>
    </div>
  </div>
</div> 