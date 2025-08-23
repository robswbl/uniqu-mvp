<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let userData: any = null;
	let isLoading = true;

	onMount(async () => {
		// Get current user ID from localStorage
		const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

		if (!currentUserId) {
			// No user logged in, redirect to home
			goto('/');
			return;
		}

		// Fetch user data
		const { data, error } = await supabase
			.from('users')
			.select('user_firstname, user_lastname, user_email')
			.eq('user_uuid', currentUserId)
			.single();

		if (!error && data) {
			userData = data;
		}

		// Check if user has any sessions
		const { data: sessions } = await supabase
			.from('questionnaire_sessions')
			.select('id')
			.eq('user_id', currentUserId)
			.maybeSingle();

		if (sessions) {
			// User has a session, redirect to their dashboard
			goto(`/dashboard/${sessions.id}`);
			return;
		}

		isLoading = false;
	});
</script>

<svelte:head>
	<title>Profile - UniqU</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<div class="mx-auto max-w-4xl px-4 py-8">
		{#if isLoading}
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
				></div>
				<p class="text-gray-600">Loading profile...</p>
			</div>
		{:else}
			<div class="rounded-2xl bg-white p-8 shadow-lg">
				<h1 class="mb-6 text-3xl font-bold text-gray-900">Profile</h1>

				{#if userData}
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700">First Name</label>
							<p class="mt-1 text-lg text-gray-900">{userData.user_firstname || 'Not set'}</p>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700">Last Name</label>
							<p class="mt-1 text-lg text-gray-900">{userData.user_lastname || 'Not set'}</p>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700">Email</label>
							<p class="mt-1 text-lg text-gray-900">{userData.user_email || 'Not set'}</p>
						</div>
					</div>

					<div class="mt-8 border-t border-gray-200 pt-6">
						<p class="text-gray-600">
							You don't have any active sessions yet. Start your career journey to create your first
							session.
						</p>
						<button
							on:click={() => goto('/')}
							class="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
						>
							Start Journey
						</button>
					</div>
				{:else}
					<div class="text-center">
						<p class="text-gray-600">Unable to load profile information.</p>
						<button
							on:click={() => goto('/')}
							class="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
						>
							Go Home
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
