<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import bcrypt from 'bcryptjs';
	import { v4 as uuidv4 } from 'uuid';
	import { onMount } from 'svelte';

	let firstName = '';
	let lastName = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let agencyId = '';
	let agencies: any[] = [];
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	onMount(async () => {
		await loadAgencies();
	});

	async function loadAgencies() {
		try {
			const { data: agenciesData, error: agenciesError } = await supabase
				.from('agencies')
				.select('id, name, agency_type')
				.eq('is_active', true)
				.order('name');

			if (agenciesError) throw agenciesError;
			agencies = agenciesData || [];
		} catch (error) {
			console.error('Error loading agencies:', error);
			errorMessage = $t('agency.signup.failed_load_agencies');
		}
	}

	async function handleSignup() {
		// Validation
		if (!firstName || !lastName || !email || !password || !confirmPassword || !agencyId) {
			errorMessage = $t('agency.signup.fill_all_fields');
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = $t('agency.signup.passwords_dont_match');
			return;
		}

		if (password.length < 8) {
			errorMessage = $t('agency.signup.password_too_short');
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// First, check if the required tables exist by trying to get the default role
			const { data: defaultRole, error: roleError } = await supabase
				.from('agency_user_roles')
				.select('id')
				.eq('name', 'agent')
				.single();

			if (roleError) {
				if (roleError.code === 'PGRST116') {
					// Table doesn't exist - this means the migration hasn't been run
					errorMessage = $t('agency.signup.system_not_setup');
				} else {
					errorMessage = $t('agency.signup.failed_access_roles');
				}
				console.error('Role lookup error:', roleError);
				return;
			}

			if (!defaultRole) {
				errorMessage = $t('agency.signup.default_role_not_found');
				return;
			}

			// Check if email already exists
			const { data: existingUser, error: checkError } = await supabase
				.from('agency_users')
				.select('id')
				.eq('email', email.toLowerCase().trim())
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				// PGRST116 means "no rows returned" - that's fine, email doesn't exist
				console.error('Email check error:', checkError);
				errorMessage = $t('agency.signup.failed_check_email');
				return;
			}

			if (existingUser) {
				errorMessage = $t('agency.signup.email_already_exists');
				return;
			}

			// Hash password
			const passwordHash = await bcrypt.hash(password, 10);

			// Create agency user
			const { data: newUser, error: userError } = await supabase
				.from('agency_users')
				.insert({
					email: email.toLowerCase().trim(),
					password_hash: passwordHash,
					first_name: firstName.trim(),
					last_name: lastName.trim(),
					agency_id: agencyId,
					role_id: defaultRole.id,
					is_active: true,
					email_verified: false
				})
				.select()
				.single();

			if (userError) {
				console.error('User creation error:', userError);
				errorMessage = $t('agency.signup.failed_create_account');
				return;
			}

			successMessage = $t('agency.signup.success_redirecting');
			
			// Clear form
			firstName = '';
			lastName = '';
			email = '';
			password = '';
			confirmPassword = '';
			agencyId = '';

			// Redirect to login after a delay
			setTimeout(() => {
				goto('/agency-portal/login');
			}, 2000);

		} catch (error) {
			console.error('Signup error:', error);
			errorMessage = $t('agency.signup.unexpected_error');
		} finally {
			isLoading = false;
		}
	}

	function goToLogin() {
		goto('/agency-portal/login');
	}
</script>

<svelte:head>
	<title>{$t('agency.signup.page_title')}</title>
</svelte:head>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
	<div class="text-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">{$t('agency.signup.title')}</h2>
		<p class="text-gray-600">{$t('agency.signup.subtitle')}</p>
	</div>

	{#if errorMessage}
		<div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
			{errorMessage}
		</div>
	{/if}

	{#if successMessage}
		<div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
			{successMessage}
		</div>
	{/if}

	<form on:submit|preventDefault={handleSignup} class="space-y-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
					{$t('agency.signup.first_name_label')}
				</label>
				<input
					id="firstName"
					type="text"
					bind:value={firstName}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder={$t('agency.signup.first_name_placeholder')}
				/>
			</div>

			<div>
				<label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
					{$t('agency.signup.last_name_label')}
				</label>
				<input
					id="lastName"
					type="text"
					bind:value={lastName}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder={$t('agency.signup.last_name_placeholder')}
				/>
			</div>
		</div>

		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.signup.email_label')}
			</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder={$t('agency.signup.email_placeholder')}
			/>
		</div>

		<div>
			<label for="agencyId" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.signup.agency_label')}
			</label>
			<select
				id="agencyId"
				bind:value={agencyId}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
			>
				<option value="">{$t('agency.signup.select_agency')}</option>
				{#each agencies as agency}
					<option value={agency.id}>{agency.name} ({agency.agency_type})</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.signup.password_label')}
			</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder={$t('agency.signup.password_placeholder')}
			/>
			<p class="text-xs text-gray-500 mt-1">{$t('agency.signup.password_requirement')}</p>
		</div>

		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.signup.confirm_password_label')}
			</label>
			<input
				id="confirmPassword"
				type="password"
				bind:value={confirmPassword}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder={$t('agency.signup.confirm_password_placeholder')}
			/>
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{isLoading ? $t('agency.signup.creating_account') : $t('agency.signup.create_account')}
		</button>
	</form>

	<div class="mt-6 text-center">
		<p class="text-sm text-gray-600">
			{$t('agency.signup.already_have_account')}
			<button
				on:click={goToLogin}
				class="text-indigo-600 hover:text-indigo-500 font-medium"
			>
				{$t('agency.signup.sign_in_here')}
			</button>
		</p>
	</div>
</div>
