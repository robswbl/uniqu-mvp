<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import { setupI18n } from '$lib/i18n';
	import { waitLocale } from '$lib/i18n';

	// Setup i18n
	setupI18n('en');
	waitLocale();

	let agencies: any[] = [];
	let isLoading = true;
	let error = '';

	onMount(() => {
		loadAgencyData();
	});

	async function loadAgencyData() {
		try {
			isLoading = true;
			error = '';

			// Get all agencies with their assigned users
			const { data: agencyData, error: agencyError } = await supabase
				.from('agencies')
				.select('*')
				.order('name');

			if (agencyError) {
				throw agencyError;
			}

			// Get detailed user information for each agency
			const agenciesWithUsers = await Promise.all(
				agencyData.map(async (agency) => {
					const { data: users, error: usersError } = await supabase
						.from('agency_users')
						.select('id, first_name, last_name, email, created_at, role_id')
						.eq('agency_id', agency.id);

					if (usersError) {
						console.error('Error loading users for agency:', agency.id, usersError);
						return { ...agency, users: [] };
					}

					return {
						...agency,
						users: users || []
					};
				})
			);

			agencies = agenciesWithUsers;
		} catch (err) {
			console.error('Error loading agency data:', err);
			error = $t('agency.admin.agency_overview.error_loading');
		} finally {
			isLoading = false;
		}
	}

	async function removeUserFromAgency(userId: string, agencyId: string) {
		try {
			const { error } = await supabase
				.from('agency_users')
				.update({ agency_id: null })
				.eq('id', userId);

			if (error) {
				throw error;
			}

			// Reload data to reflect changes
			await loadAgencyData();
		} catch (err) {
			console.error('Error removing user from agency:', err);
			error = 'Failed to remove user from agency. Please try again.';
		}
	}

	async function assignUserToAgency(userId: string, agencyId: string) {
		try {
			const { error } = await supabase
				.from('users')
				.update({ agency_id: agencyId })
				.eq('user_uuid', userId);

			if (error) {
				throw error;
			}

			// Reload data to reflect changes
			await loadAgencyData();
		} catch (err) {
			console.error('Error assigning user to agency:', err);
			error = 'Failed to assign user to agency. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Admin - Agency Overview</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('agency.admin.agency_overview.title')}</h1>
				<p class="text-gray-600">{$t('agency.admin.agency_overview.subtitle')}</p>
			</div>
			<a 
				href="/admin" 
				class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
			>
				{$t('agency.admin.agency_overview.back_to_admin')}
			</a>
		</div>
	</div>

		{#if error}
			<div class="mb-6 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-red-800">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
					<p class="mt-4 text-gray-600">{$t('agency.admin.agency_overview.loading')}</p>
				</div>
			</div>
		{:else}
			<!-- Agency List -->
			<div class="space-y-6">
				{#each agencies as agency}
					<div class="bg-white rounded-lg shadow overflow-hidden">
						<div class="px-6 py-4 border-b border-gray-200">
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-medium text-gray-900">{agency.name}</h3>
									<p class="text-sm text-gray-500">ID: {agency.id}</p>
								</div>
								<div class="text-right">
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
										{agency.users.length} {agency.users.length === 1 ? $t('agency.admin.agency_overview.users_count') : $t('agency.admin.agency_overview.users_count_plural')}
									</span>
								</div>
							</div>
						</div>

						{#if agency.users.length > 0}
							<div class="px-6 py-4">
								<h4 class="text-sm font-medium text-gray-700 mb-3">{$t('agency.admin.agency_overview.assigned_users')}</h4>
								<div class="space-y-3">
									{#each agency.users as user}
										<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
											<div class="flex-1">
												<div class="flex items-center space-x-3">
													<div class="flex-shrink-0">
														<div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
															<span class="text-sm font-medium text-indigo-600">
																{user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
															</span>
														</div>
													</div>
													<div>
														<p class="text-sm font-medium text-gray-900">
															{user.first_name || 'Unknown'} {user.last_name || 'Name'}
														</p>
														<p class="text-xs text-gray-500">{user.email}</p>
														<p class="text-xs text-gray-400">Created: {new Date(user.created_at).toLocaleDateString()}</p>
													</div>
												</div>
											</div>
											<button
												on:click={() => removeUserFromAgency(user.id, agency.id)}
												class="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
											>
												{$t('agency.admin.agency_overview.remove')}
											</button>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="px-6 py-4">
								<p class="text-sm text-gray-500 italic">{$t('agency.admin.agency_overview.no_users_assigned')}</p>
							</div>
						{/if}
					</div>
				{/each}

				{#if agencies.length === 0}
					<div class="text-center py-12">
						<div class="mx-auto h-12 w-12 text-gray-400">
							<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
							</svg>
						</div>
						<h3 class="mt-2 text-sm font-medium text-gray-900">{$t('agency.admin.agency_overview.no_agencies')}</h3>
						<p class="mt-1 text-sm text-gray-500">{$t('agency.admin.agency_overview.no_agencies_desc')}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
