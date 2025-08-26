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
			errorMessage = 'Failed to load agencies. Please try again.';
		}
	}

	async function handleSignup() {
		// Validation
		if (!firstName || !lastName || !email || !password || !confirmPassword || !agencyId) {
			errorMessage = 'Please fill in all fields.';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match.';
			return;
		}

		if (password.length < 8) {
			errorMessage = 'Password must be at least 8 characters long.';
			return;
		}

		isLoading = true;
		errorMessage = '';
		successMessage = '';

		try {
			// Check if email already exists
			const { data: existingUser, error: checkError } = await supabase
				.from('agency_users')
				.select('id')
				.eq('email', email.toLowerCase().trim())
				.single();

			if (existingUser) {
				errorMessage = 'An account with this email already exists.';
				return;
			}

			// Hash password
			const passwordHash = await bcrypt.hash(password, 10);

			// Get default role (agent)
			const { data: defaultRole, error: roleError } = await supabase
				.from('agency_user_roles')
				.select('id')
				.eq('name', 'agent')
				.single();

			if (roleError || !defaultRole) {
				errorMessage = 'Failed to assign user role. Please contact support.';
				return;
			}

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
				errorMessage = 'Failed to create account. Please try again.';
				return;
			}

			successMessage = 'Account created successfully! You can now sign in.';
			
			// Clear form
			firstName = '';
			lastName = '';
			email = '';
			password = '';
			confirmPassword = '';
			agencyId = '';

			// Redirect to login after a delay
			setTimeout(() => {
				goto('/agency-auth/login');
			}, 2000);

		} catch (error) {
			console.error('Signup error:', error);
			errorMessage = 'An unexpected error occurred. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function goToLogin() {
		goto('/agency-auth/login');
	}
</script>

<svelte:head>
	<title>Agency Signup</title>
</svelte:head>

<div class="max-w-md mx-auto">
	<div class="bg-white rounded-lg shadow-lg p-8">
		<div class="text-center mb-6">
			<h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
			<p class="text-gray-600">Join your agency on the platform</p>
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
						First Name
					</label>
					<input
						id="firstName"
						type="text"
						bind:value={firstName}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						placeholder="First name"
					/>
				</div>

				<div>
					<label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
						Last Name
					</label>
					<input
						id="lastName"
						type="text"
						bind:value={lastName}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
						placeholder="Last name"
					/>
				</div>
			</div>

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
					Email Address
				</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="Enter your email"
				/>
			</div>

			<div>
				<label for="agencyId" class="block text-sm font-medium text-gray-700 mb-1">
					Agency
				</label>
				<select
					id="agencyId"
					bind:value={agencyId}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
				>
					<option value="">Select your agency</option>
					{#each agencies as agency}
						<option value={agency.id}>{agency.name} ({agency.agency_type})</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
					Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="Create a password"
				/>
				<p class="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
			</div>

			<div>
				<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
					Confirm Password
				</label>
				<input
					id="confirmPassword"
					type="password"
					bind:value={confirmPassword}
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
					placeholder="Confirm your password"
				/>
			</div>

			<button
				type="submit"
				disabled={isLoading}
				class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isLoading ? 'Creating Account...' : 'Create Account'}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-sm text-gray-600">
				Already have an account?
				<button
					on:click={goToLogin}
					class="text-indigo-600 hover:text-indigo-500 font-medium"
				>
					Sign in here
				</button>
			</p>
		</div>
	</div>
</div>
