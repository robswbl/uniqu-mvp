<!-- src/routes/create-user/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let firstName = '';
	let lastName = '';
	let gender = '';
	let email = '';
	let language = '';
	let agency = '';
	let user_search_regions = '';
	let user_search_industries = '';
	let isSubmitting = false;
	let message = '';
	let messageType = '';

	// Optional address/contact fields (non-mandatory)
	let street = '';
	let zip = '';
	let city = '';
	let country = '';
	let phoneNumber = '';

	// Password fields (mandatory)
	let password = '';
	let confirmPassword = '';

	// Agencies for dropdown
	let agencies: Array<{ id: string; name: string }> = [];

	onMount(async () => {
		const { data, error } = await supabase
			.from('agencies')
			.select('id, name')
			.order('name', { ascending: true });
		if (!error && data) {
			agencies = data as Array<{ id: string; name: string }>;
		}
	});

	// Generate UUID function
	function generateUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}

	// Wait for user to appear in Supabase after webhook
	async function waitForUser(email: string, maxTries = 5, delayMs = 2000) {
		console.log('waitForUser lookup for email:', email);
		for (let i = 0; i < maxTries; i++) {
			const { data: user, error: userError } = await supabase
				.from('users')
				.select('user_uuid')
				.eq('user_email', email)
				.single();
			if (user && user.user_uuid) return user.user_uuid;
			await new Promise((res) => setTimeout(res, delayMs));
		}
		return null;
	}

	async function createUser() {
		if (!firstName || !lastName || !gender || !email || !language) {
			message = $t('create_user.fill_all_fields');
			messageType = 'error';
			return;
		}

		// Password validation
		if (!password || !confirmPassword) {
			message = 'Please set and confirm a password.';
			messageType = 'error';
			return;
		}
		if (password !== confirmPassword) {
			message = 'Passwords do not match.';
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
				agency,
				user_search_regions,
				user_search_industries,
				street,
				zip,
				city,
				country,
				phoneNumber,
				password
			};

			const response = await fetch(
				'https://manage.app.n8n.cloud/webhook/clients/uniqu-createuser',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(userData)
				}
			);

			if (response.ok) {
				// Wait for user to appear in Supabase
				const userUuid = await waitForUser(email);
				if (userUuid) {
					// Create a new session for the user
					const { error: sessionError } = await supabase.from('questionnaire_sessions').insert({
						user_id: userUuid,
						status: 'in-progress',
						created_at: new Date().toISOString()
					});
					if (sessionError) {
						message = 'User created, but failed to create session.';
						messageType = 'error';
					} else {
						message = $t('create_user.success');
						messageType = 'success';
						// Clear form
						firstName = '';
						lastName = '';
						gender = '';
						email = '';
						language = '';
						agency = '';
						user_search_regions = '';
						user_search_industries = '';
						street = '';
						zip = '';
						city = '';
						country = '';
						phoneNumber = '';
						password = '';
						confirmPassword = '';
					}
				} else {
					message = 'User created, but could not find user UUID to create session.';
					messageType = 'error';
				}
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
	<div class="mx-auto max-w-2xl">
		<!-- Header -->
		<div class="mb-8">
			<button
				on:click={() => goto('/')}
				class="mb-4 inline-flex items-center text-indigo-600 transition-colors duration-200 hover:text-indigo-800"
				type="button"
			>
				<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				{$t('create_user.back_to_home')}
			</button>

			<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('create_user.heading')}</h1>
			<p class="text-gray-600">{$t('create_user.subheading')}</p>
		</div>

		<!-- Form -->
		<div class="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
			<form on:submit|preventDefault={createUser} class="space-y-6">
				<div class="grid gap-6 md:grid-cols-2">
					<!-- First Name -->
					<div>
						<label for="firstName" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.first_name_label')} *
						</label>
						<input
							id="firstName"
							type="text"
							bind:value={firstName}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
							placeholder={$t('create_user.first_name_placeholder')}
						/>
					</div>
					<!-- Last Name -->
					<div>
						<label for="lastName" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.last_name_label')} *
						</label>
						<input
							id="lastName"
							type="text"
							bind:value={lastName}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
							placeholder={$t('create_user.last_name_placeholder')}
						/>
					</div>
					<!-- Gender -->
					<div>
						<label for="gender" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.gender_label')} *
						</label>
						<select
							id="gender"
							bind:value={gender}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">{$t('create_user.gender_select')}</option>
							<option value="male">{$t('create_user.gender_male')}</option>
							<option value="female">{$t('create_user.gender_female')}</option>
						</select>
					</div>
					<!-- Email -->
					<div>
						<label for="email" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.email_label')} *
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
							placeholder={$t('create_user.email_placeholder')}
						/>
					</div>
				</div>
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Language -->
					<div>
						<label for="language" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.language_label')} *
						</label>
						<select
							id="language"
							bind:value={language}
							required
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">{$t('create_user.language_select')}</option>
							<option value="en">{$t('create_user.language_english')}</option>
							<option value="de">{$t('create_user.language_german')}</option>
							<option value="fr">{$t('create_user.language_french')}</option>
							<option value="it">{$t('create_user.language_italian')}</option>
							<option value="es">{$t('create_user.language_spanish')}</option>
						</select>
					</div>
					<!-- Agency -->
					<div>
						<label for="agency" class="mb-2 block text-sm font-medium text-gray-700">
							{$t('create_user.agency_label')}
						</label>
						<select
							id="agency"
							bind:value={agency}
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
						>
							<option value="">None</option>
							{#each agencies as a}
								<option value={a.id}>{a.name}</option>
							{/each}
						</select>
					</div>
					<!-- User Search Regions -->
					<div>
						<label for="user_search_regions" class="mb-2 block text-sm font-medium text-gray-700">
							In which city/cities or region(s) is the user looking for work?
						</label>
						<input
							id="user_search_regions"
							type="text"
							bind:value={user_search_regions}
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
							placeholder="e.g. Berlin, Hamburg, Bavaria, remote, ..."
						/>
					</div>
					<!-- User Search Industries -->
					<div>
						<label for="user_search_industries" class="mb-2 block text-sm font-medium text-gray-700">
							Which are the preferred industries of the user?
						</label>
						<input
							id="user_search_industries"
							type="text"
							bind:value={user_search_industries}
							class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
							placeholder="e.g. Tech, Healthcare, Education, ..."
						/>
					</div>
				</div>
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Street (optional) -->
					<div>
						<label for="street" class="mb-2 block text-sm font-medium text-gray-700">Street</label>
						<input id="street" type="text" bind:value={street} class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
					<!-- Zip (optional) -->
					<div>
						<label for="zip" class="mb-2 block text-sm font-medium text-gray-700">Zip</label>
						<input id="zip" type="text" bind:value={zip} class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
					<!-- City (optional) -->
					<div>
						<label for="city" class="mb-2 block text-sm font-medium text-gray-700">City</label>
						<input id="city" type="text" bind:value={city} class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
					<!-- Country (optional) -->
					<div>
						<label for="country" class="mb-2 block text-sm font-medium text-gray-700">Country</label>
						<input id="country" type="text" bind:value={country} class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
					<!-- Phone Number (optional) -->
					<div>
						<label for="phoneNumber" class="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
						<input id="phoneNumber" type="tel" bind:value={phoneNumber} class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
				</div>
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Password (mandatory) -->
					<div>
						<label for="password" class="mb-2 block text-sm font-medium text-gray-700">Password *</label>
						<input id="password" type="password" bind:value={password} required class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
					<!-- Confirm Password (mandatory) -->
					<div>
						<label for="confirmPassword" class="mb-2 block text-sm font-medium text-gray-700">Repeat Password *</label>
						<input id="confirmPassword" type="password" bind:value={confirmPassword} required class="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
					</div>
				</div>

				<!-- Message -->
				{#if message}
					<div
						class="rounded-lg p-4 {messageType === 'success'
							? 'border border-green-200 bg-green-50 text-green-800'
							: 'border border-red-200 bg-red-50 text-red-800'}"
					>
						{message}
					</div>
				{/if}

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isSubmitting}
					class="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-indigo-700 disabled:bg-indigo-400"
				>
					{#if isSubmitting}
						<svg
							class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{$t('create_user.creating')}
					{:else}
						{$t('create_user.create')}
					{/if}
				</button>
			</form>
		</div>

		<!-- Info Box -->
		<div class="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-5 w-5 text-blue-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<div>
					<h3 class="text-sm font-medium text-blue-900">{$t('create_user.info_title')}</h3>
					<p class="mt-1 text-sm text-blue-700">
						{$t('create_user.info_desc')}
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
