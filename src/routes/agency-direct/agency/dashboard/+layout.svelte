<script lang="ts">
	import { page } from '$app/stores';
	import { t } from 'svelte-i18n';
	import { getAgencySession, clearAgencySession } from '$lib/agencyAuth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let session: any = null;

	onMount(() => {
		session = getAgencySession();
	});

	async function handleLogout() {
		if (session) {
			await clearAgencySession(session);
		}
		goto('/agency/login');
	}
</script>

<svelte:head>
	<title>Agency Dashboard</title>
</svelte:head>

<!-- Dashboard-specific layout - no duplicate header -->
<div class="min-h-screen">
	<!-- Agency Dashboard Header with User Session - replaces parent header -->
	<header class="bg-white shadow-sm border-b border-gray-200 mb-8">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-4">
				<div class="flex items-center">
					<h1 class="text-2xl font-bold text-purple-900">Agency Dashboard</h1>
					{#if session?.user?.agencyName}
						<span class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
							{session.user.agencyName}
						</span>
					{/if}
				</div>
				<div class="flex items-center space-x-4">
					<!-- Agency User Info -->
					{#if session?.user}
						<div class="text-right">
							<p class="text-sm font-medium text-gray-900">
								{session.user.firstName} {session.user.lastName}
							</p>
							<p class="text-xs text-gray-500 capitalize">{session.user.role}</p>
						</div>
						<button
							on:click={handleLogout}
							class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
						>
							Logout
						</button>
					{:else}
						<!-- Loading or redirect state -->
						<div class="text-gray-500">Loading...</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content Area -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<slot />
	</main>
</div>
