<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import { setupI18n } from '$lib/i18n';
	import { waitLocale } from '$lib/i18n';

	// Setup i18n
	setupI18n('en');
	waitLocale();

	let agencyUsers: any[] = [];
	let agencies: any[] = [];
	let isLoading = true;
	let error = '';
	let showAssignModal = false;
	let selectedUser: any = null;
	let selectedAgencyId = '';

	onMount(() => {
		loadData();
	});

	async function loadData() {
		try {
			isLoading = true;
			error = '';

			// Load agency users
			const { data: usersData, error: usersError } = await supabase
				.from('agency_users')
				.select(`
					*,
					agency:agencies(id, name)
				`)
				.order('created_at', { ascending: false });

			if (usersError) {
				throw usersError;
			}

			// Load all agencies for assignment
			const { data: agenciesData, error: agenciesError } = await supabase
				.from('agencies')
				.select('id, name')
				.order('name');

			if (agenciesError) {
				throw agenciesError;
			}

			agencyUsers = usersData || [];
			agencies = agenciesData || [];
		} catch (err) {
			console.error('Error loading data:', err);
			error = $t('agency.admin.agency_users.error_loading');
		} finally {
			isLoading = false;
		}
	}

	function openAssignModal(user: any) {
		selectedUser = user;
		selectedAgencyId = user.agency_id || '';
		showAssignModal = true;
	}

	function closeAssignModal() {
		showAssignModal = false;
		selectedUser = null;
		selectedAgencyId = '';
	}

	async function assignUserToAgency() {
		if (!selectedUser || !selectedAgencyId) return;

		try {
			const { error } = await supabase
				.from('agency_users')
				.update({ agency_id: selectedAgencyId })
				.eq('id', selectedUser.id);

			if (error) {
				throw error;
			}

			// Reload data to reflect changes
			await loadData();
			closeAssignModal();
		} catch (err) {
			console.error('Error assigning user to agency:', err);
			error = 'Failed to assign user to agency. Please try again.';
		}
	}

	async function removeUserFromAgency(userId: string) {
		try {
			const { error } = await supabase
				.from('agency_users')
				.update({ agency_id: null })
				.eq('id', userId);

			if (error) {
				throw error;
			}

			// Reload data to reflect changes
			await loadData();
		} catch (err) {
			console.error('Error removing user from agency:', err);
			error = 'Failed to remove user from agency. Please try again.';
		}
	}

	async function deleteAgencyUser(userId: string) {
		if (!confirm($t('agency.admin.agency_users.delete_confirm'))) {
			return;
		}

		try {
			const { error } = await supabase
				.from('agency_users')
				.delete()
				.eq('id', userId);

			if (error) {
				throw error;
			}

			// Reload data to reflect changes
			await loadData();
		} catch (err) {
			console.error('Error deleting agency user:', err);
			error = 'Failed to delete agency user. Please try again.';
		}
	}

	function getRoleBadgeColor(role: string) {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800';
			case 'manager':
				return 'bg-purple-100 text-purple-800';
			case 'agent':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>Admin - Agency Users Management</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('agency.admin.agency_users.title')}</h1>
				<p class="text-gray-600">{$t('agency.admin.agency_users.subtitle')}</p>
			</div>
			<a 
				href="/admin" 
				class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
			>
				{$t('agency.admin.agency_users.back_to_admin')}
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
					<p class="mt-4 text-gray-600">{$t('agency.admin.agency_users.loading')}</p>
				</div>
			</div>
		{:else}
			<!-- Agency Users Table -->
			<div class="bg-white shadow overflow-hidden sm:rounded-md">
				<div class="px-4 py-5 sm:px-6 border-b border-gray-200">
					<h3 class="text-lg leading-6 font-medium text-gray-900">
						Agency Users ({agencyUsers.length})
					</h3>
				</div>
				<ul class="divide-y divide-gray-200">
					{#each agencyUsers as user}
						<li class="px-4 py-4 sm:px-6">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<div class="flex-shrink-0">
										<div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
											<span class="text-sm font-medium text-indigo-600">
												{user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
											</span>
										</div>
									</div>
									<div>
										<div class="flex items-center space-x-2">
											<p class="text-sm font-medium text-gray-900">
												{user.first_name || 'Unknown'} {user.last_name || 'Name'}
											</p>
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getRoleBadgeColor(user.role)}">
												{user.role || 'unknown'}
											</span>
										</div>
										<p class="text-sm text-gray-500">{user.email}</p>
										<p class="text-xs text-gray-400">Created: {new Date(user.created_at).toLocaleDateString()}</p>
									</div>
								</div>
								<div class="flex items-center space-x-3">
									<div class="text-right">
										{#if user.agency}
											<p class="text-sm font-medium text-gray-900">{user.agency.name}</p>
											<p class="text-xs text-gray-500">Agency ID: {user.agency.id}</p>
										{:else}
											<p class="text-sm text-gray-500 italic">{$t('agency.admin.agency_users.no_agency_assigned')}</p>
										{/if}
									</div>
									<div class="flex space-x-2">
										<button
											on:click={() => openAssignModal(user)}
											class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
										>
											{user.agency ? $t('agency.admin.agency_users.reassign') : $t('agency.admin.agency_users.assign')}
										</button>
										{#if user.agency}
											<button
												on:click={() => removeUserFromAgency(user.id)}
												class="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
											>
												{$t('agency.admin.agency_users.remove')}
											</button>
										{/if}
										<button
											on:click={() => deleteAgencyUser(user.id)}
											class="inline-flex items-center px-3 py-1.5 border border-red-600 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
										>
											{$t('agency.admin.agency_users.delete')}
										</button>
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>

				{#if agencyUsers.length === 0}
					<div class="text-center py-12">
						<div class="mx-auto h-12 w-12 text-gray-400">
							<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
							</svg>
						</div>
						<h3 class="mt-2 text-sm font-medium text-gray-900">{$t('agency.admin.agency_users.no_agency_users')}</h3>
						<p class="mt-1 text-sm text-gray-500">{$t('agency.admin.agency_users.no_agency_users_desc')}</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

<!-- Assignment Modal -->
{#if showAssignModal}
	<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
		<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
			<div class="mt-3">
				<h3 class="text-lg font-medium text-gray-900 mb-4">
					{$t('agency.admin.agency_users.assign_user')}
				</h3>
				<div class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							{$t('agency.admin.agency_users.user')}: {selectedUser?.first_name} {selectedUser?.last_name}
						</label>
					</div>
					<div>
						<label for="agency-select" class="block text-sm font-medium text-gray-700 mb-2">
							{$t('agency.admin.agency_users.select_agency')}
						</label>
						<select
							id="agency-select"
							bind:value={selectedAgencyId}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
						>
							<option value="">{$t('agency.admin.agency_users.no_agency')}</option>
							{#each agencies as agency}
								<option value={agency.id}>{agency.name}</option>
							{/each}
						</select>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							on:click={closeAssignModal}
							class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
						>
							{$t('agency.admin.agency_users.cancel')}
						</button>
						<button
							on:click={assignUserToAgency}
							class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
						>
							{$t('agency.admin.agency_users.assign')}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
