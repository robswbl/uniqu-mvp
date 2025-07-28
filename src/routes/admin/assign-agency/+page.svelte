<!-- src/routes/admin/assign-agency/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';

	let users: any[] = [];
	let agencies: any[] = [];
	let selectedUser = '';
	let selectedAgency = '';
	let relationshipType = 'client';
	let startDate = '';
	let notes = '';
	let isSubmitting = false;
	let message = '';
	let messageType = '';

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		try {
			console.log('Starting to load data...');
			
			// Check authentication
			const { data: { session }, error: authError } = await supabase.auth.getSession();
			console.log('Auth session:', { session, authError });
			
			// Test simple query first
			console.log('Testing simple query...');
			const { data: testData, error: testError } = await supabase
				.from('agencies')
				.select('count')
				.limit(1);
			console.log('Test query result:', { testData, testError });
			
			// Load users
			console.log('Loading users...');
			const { data: usersData, error: usersError } = await supabase
				.from('users')
				.select('user_uuid, user_firstname, user_lastname, user_email')
				.order('user_firstname');

			console.log('Users result:', { usersData, usersError });
			if (usersError) throw usersError;
			users = usersData || [];

			// Load agencies
			console.log('Loading agencies...');
			const { data: agenciesData, error: agenciesError } = await supabase
				.from('agencies')
				.select('id, name, agency_type')
				.eq('is_active', true)
				.order('name');

			console.log('Agencies result:', { agenciesData, agenciesError });
			if (agenciesError) throw agenciesError;
			agencies = agenciesData || [];

		} catch (err: any) {
			console.error('Error in loadData:', err);
			message = 'Error loading data: ' + err.message;
			messageType = 'error';
		}
	}

	async function assignUserToAgency() {
		if (!selectedUser || !selectedAgency) {
			message = 'Please select both a user and an agency.';
			messageType = 'error';
			return;
		}

		isSubmitting = true;
		message = '';

		try {
			const { error } = await supabase
				.from('user_agencies')
				.insert({
					user_id: selectedUser,
					agency_id: selectedAgency,
					relationship_type: relationshipType,
					start_date: startDate || null,
					notes: notes || null,
					is_active: true
				});

			if (error) throw error;

			// Log the activity
			await supabase
				.from('agency_activities')
				.insert({
					agency_id: selectedAgency,
					user_id: selectedUser,
					activity_type: 'user_registered',
					metadata: { 
						action: 'user_assigned',
						relationship_type: relationshipType,
						assigned_by: 'admin'
					}
				});

			message = 'User successfully assigned to agency!';
			messageType = 'success';

			// Reset form
			selectedUser = '';
			selectedAgency = '';
			relationshipType = 'client';
			startDate = '';
			notes = '';

		} catch (err: any) {
			message = 'Error assigning user: ' + err.message;
			messageType = 'error';
		} finally {
			isSubmitting = false;
		}
	}

	function getUserDisplayName(user: any) {
		return `${user.user_firstname} ${user.user_lastname} (${user.user_email})`;
	}

	function getAgencyDisplayName(agency: any) {
		return `${agency.name} (${agency.agency_type})`;
	}
</script>

<svelte:head>
	<title>Assign User to Agency - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 py-8">
		<div class="bg-white rounded-lg shadow-sm p-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-8">Assign User to Agency</h1>

			{#if message}
				<div class="mb-6 p-4 rounded-lg {
					messageType === 'success' 
						? 'bg-green-50 border border-green-200 text-green-800'
						: 'bg-red-50 border border-red-200 text-red-800'
				}">
					{message}
				</div>
			{/if}

			<form on:submit|preventDefault={assignUserToAgency} class="space-y-6">
				<!-- User Selection -->
				<div>
					<label for="user" class="block text-sm font-medium text-gray-700 mb-2">
						Select User *
					</label>
					<select
						id="user"
						bind:value={selectedUser}
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
					>
						<option value="">Choose a user...</option>
						{#each users as user}
							<option value={user.user_uuid}>
								{getUserDisplayName(user)}
							</option>
						{/each}
					</select>
				</div>

				<!-- Agency Selection -->
				<div>
					<label for="agency" class="block text-sm font-medium text-gray-700 mb-2">
						Select Agency *
					</label>
					<select
						id="agency"
						bind:value={selectedAgency}
						required
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
					>
						<option value="">Choose an agency...</option>
						{#each agencies as agency}
							<option value={agency.id}>
								{getAgencyDisplayName(agency)}
							</option>
						{/each}
					</select>
				</div>

				<!-- Relationship Type -->
				<div>
					<label for="relationshipType" class="block text-sm font-medium text-gray-700 mb-2">
						Relationship Type
					</label>
					<select
						id="relationshipType"
						bind:value={relationshipType}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
					>
						<option value="client">Client</option>
						<option value="employee">Employee</option>
						<option value="partner">Partner</option>
					</select>
				</div>

				<!-- Start Date -->
				<div>
					<label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
						Start Date
					</label>
					<input
						id="startDate"
						type="date"
						bind:value={startDate}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
					/>
				</div>

				<!-- Notes -->
				<div>
					<label for="notes" class="block text-sm font-medium text-gray-700 mb-2">
						Notes
					</label>
					<textarea
						id="notes"
						bind:value={notes}
						rows="3"
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
						placeholder="Optional notes about this relationship..."
					></textarea>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={isSubmitting}
						class="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? 'Assigning...' : 'Assign User to Agency'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div> 