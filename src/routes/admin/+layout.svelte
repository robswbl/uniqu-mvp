<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { setupI18n } from '$lib/i18n';
	import { locale, waitLocale } from '$lib/i18n';
	import { t } from 'svelte-i18n';

	// Setup i18n
	setupI18n('en');
	waitLocale();

	let isAuthenticated = false;
	let isLoading = true;
	let error = '';

	onMount(async () => {
		// Check if user is already authenticated
		const adminSession = localStorage.getItem('adminSession');
		
		if (adminSession) {
			try {
				// Verify the session is still valid
				const sessionData = JSON.parse(adminSession);
				const now = Date.now();
				
				if (sessionData.expiresAt && now < sessionData.expiresAt) {
					isAuthenticated = true;
				} else {
					// Session expired, clear it
					localStorage.removeItem('adminSession');
				}
			} catch (err) {
				console.error('Error parsing admin session:', err);
				localStorage.removeItem('adminSession');
			}
		}
		
		isLoading = false;
	});

	function authenticate(password: string) {
		// Simple admin password check - you might want to make this more secure
		if (password === 'Konrad1982') {
			// Create a session that expires in 24 hours
			const sessionData = {
				authenticated: true,
				authenticatedAt: Date.now(),
				expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
			};
			
			localStorage.setItem('adminSession', JSON.stringify(sessionData));
			isAuthenticated = true;
			error = '';
		} else {
			error = 'Incorrect password';
		}
	}

	function logout() {
		localStorage.removeItem('adminSession');
		isAuthenticated = false;
		goto('/admin');
	}

	// Check if we're on the main admin page
	$: isMainAdminPage = $page.url.pathname === '/admin';
</script>

<svelte:head>
	<title>Admin - UniqU</title>
</svelte:head>

{#if isLoading}
	<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else if !isAuthenticated}
	<!-- Admin Login -->
	<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
		<div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">UniqU Admin</h1>
				<p class="text-gray-600">Enter admin password to continue</p>
			</div>

			{#if error}
				<div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{error}
				</div>
			{/if}

			<form on:submit|preventDefault={() => {
				const passwordInput = document.getElementById('adminPassword') as HTMLInputElement;
				authenticate(passwordInput?.value || '');
			}}>
				<div class="mb-6">
					<label for="adminPassword" class="block text-sm font-medium text-gray-700 mb-2">
						Admin Password
					</label>
					<input
						type="password"
						id="adminPassword"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						placeholder="Enter admin password"
						required
					/>
				</div>
				<button
					type="submit"
					class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
				>
					Access Admin
				</button>
			</form>
		</div>
	</div>
{:else}
	<!-- Admin Content -->
	<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
		<!-- Admin Header -->
		<div class="bg-white shadow-sm border-b border-gray-200">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex justify-between items-center py-4">
					<div class="flex items-center">
						<h1 class="text-2xl font-bold text-gray-900">UniqU Admin</h1>
					</div>
					<div class="flex items-center space-x-4">
						<!-- Language Selector -->
						<select
							bind:value={$locale}
							class="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="en">English</option>
							<option value="de">Deutsch</option>
							<option value="fr">Français</option>
							<option value="es">Español</option>
							<option value="it">Italiano</option>
						</select>
						
						<button
							on:click={logout}
							class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
						>
							Logout
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Page Content -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<slot />
		</div>
	</div>
{/if}
