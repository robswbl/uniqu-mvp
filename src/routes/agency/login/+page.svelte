<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import bcrypt from 'bcryptjs';
	import { v4 as uuidv4 } from 'uuid';

	let email = '';
	let password = '';
	let isLoading = false;
	let errorMessage = '';
	let successMessage = '';

	async function handleLogin() {
		if (!email || !password) {
			errorMessage = $t('agency.login.fill_all_fields');
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// 1. Find the agency user
			const { data: agencyUser, error: userError } = await supabase
				.from('agency_users')
				.select(`
					*,
					agencies!agency_id (
						id,
						name,
						agency_type
					),
					agency_user_roles!role_id (
						id,
						name,
						permissions
					)
				`)
				.eq('email', email.toLowerCase().trim())
				.eq('is_active', true)
				.single();

			if (userError || !agencyUser) {
				errorMessage = $t('agency.login.invalid_credentials');
				return;
			}

			// 2. Verify password
			const passwordMatch = await bcrypt.compare(password, agencyUser.password_hash);
			if (!passwordMatch) {
				errorMessage = $t('agency.login.invalid_credentials');
				return;
			}

			// 3. Create session token
			const sessionToken = uuidv4();
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

			// 4. Store session in database
			const { error: sessionError } = await supabase
				.from('agency_sessions')
				.insert({
					agency_user_id: agencyUser.id,
					session_token: sessionToken,
					expires_at: expiresAt.toISOString(),
					ip_address: '127.0.0.1', // TODO: Get real IP
					user_agent: navigator.userAgent
				});

			if (sessionError) {
				console.error('Session creation error:', sessionError);
				errorMessage = $t('agency.login.session_error');
				return;
			}

			// 5. Update last login
			await supabase
				.from('agency_users')
				.update({ last_login: new Date().toISOString() })
				.eq('id', agencyUser.id);

			// 6. Store session data in localStorage
			const sessionData = {
				token: sessionToken,
				user: {
					id: agencyUser.id,
					email: agencyUser.email,
					firstName: agencyUser.first_name,
					lastName: agencyUser.last_name,
					agencyId: agencyUser.agency_id,
					agencyName: agencyUser.agencies?.name,
					role: agencyUser.agency_user_roles?.name,
					permissions: agencyUser.agency_user_roles?.permissions
				},
				expiresAt: expiresAt.toISOString()
			};

			localStorage.setItem('agencySession', JSON.stringify(sessionData));
			
			// Debug: Log what we're storing
			console.log('Login: Storing session data:', sessionData);
			console.log('Login: Session data in localStorage:', localStorage.getItem('agencySession'));

			successMessage = $t('agency.login.success_redirecting');
			
			// 7. Redirect to dashboard
			setTimeout(() => {
				console.log('Login: Redirecting to dashboard...');
				goto('/agency/dashboard');
			}, 1000);

		} catch (error) {
			console.error('Login error:', error);
			errorMessage = $t('agency.login.unexpected_error');
		} finally {
			isLoading = false;
		}
	}

	function goToSignup() {
		goto('/agency/signup');
	}
</script>

<svelte:head>
	<title>{$t('agency.login.page_title')}</title>
</svelte:head>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
	<div class="text-center mb-6">
		<h2 class="text-2xl font-bold text-gray-900">{$t('agency.login.title')}</h2>
		<p class="text-gray-600">{$t('agency.login.subtitle')}</p>
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

	<form on:submit|preventDefault={handleLogin} class="space-y-4">
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.login.email_label')}
			</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder={$t('agency.login.email_placeholder')}
			/>
		</div>

		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
				{$t('agency.login.password_label')}
			</label>
			<input
				id="password"
				type="password"
				bind:value={password}
				required
				class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				placeholder={$t('agency.login.password_placeholder')}
			/>
		</div>

		<button
			type="submit"
			disabled={isLoading}
			class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		>
			{isLoading ? $t('agency.login.signing_in') : $t('agency.login.sign_in')}
		</button>
	</form>

	<div class="mt-6 text-center">
		<p class="text-sm text-gray-600 mb-2">
			{$t('agency.login.no_account')}
		</p>
		<button
			on:click={goToSignup}
			class="text-indigo-600 hover:text-indigo-500 font-medium text-sm"
		>
			{$t('agency.login.sign_up_here')}
		</button>
	</div>
</div>
