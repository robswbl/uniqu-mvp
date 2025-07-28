<!-- src/routes/agency/[agencyId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';
	import { goto } from '$app/navigation';

	export let data;
	const { agencyId } = data;

	let agency: any = null;
	let clients: any[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadAgencyData();
	});

	async function loadAgencyData() {
		try {
			loading = true;

			// Load agency details
			const { data: agencyData, error: agencyError } = await supabase
				.from('agencies')
				.select('*')
				.eq('id', agencyId)
				.single();

			if (agencyError) throw agencyError;
			agency = agencyData;

			// Load all clients for this agency
			const { data: clientsData, error: clientsError } = await supabase
				.from('user_agencies')
				.select(`
					*,
					users:user_id (
						user_uuid,
						user_firstname,
						user_lastname,
						user_email,
						user_phone
					),
					questionnaire_sessions:users.questionnaire_sessions (
						id,
						status,
						created_at,
						completed_at
					)
				`)
				.eq('agency_id', agencyId)
				.eq('is_active', true);

			if (clientsError) throw clientsError;
			clients = clientsData || [];

		} catch (err: any) {
			error = err.message;
			console.error('Error loading agency data:', err);
		} finally {
			loading = false;
		}
	}

	async function generateClientSummary(userId: string, sessionId: string) {
		try {
			// Call the n8n webhook to generate summary
			const response = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-agentsummary', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					user_id: userId,
					session_id: sessionId,
					agency_id: agencyId
				})
			});

			if (response.ok) {
				// Log the activity
				await supabase
					.from('agency_activities')
					.insert({
						agency_id: agencyId,
						user_id: userId,
						activity_type: 'results_generated',
						session_id: sessionId,
						metadata: { action: 'summary_generated' }
					});

				alert('Summary generation started! You will receive it shortly.');
			} else {
				throw new Error('Failed to generate summary');
			}
		} catch (err: any) {
			alert('Error generating summary: ' + err.message);
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function getClientStatus(sessions: any[]) {
		if (!sessions || sessions.length === 0) return 'No sessions';
		const latestSession = sessions[sessions.length - 1];
		return latestSession.status || 'Unknown';
	}
</script>

<svelte:head>
	<title>Agency Dashboard - {agency?.name || 'Loading...'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 py-8">
		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<h3 class="text-red-800 font-medium">Error</h3>
				<p class="text-red-600">{error}</p>
			</div>
		{:else}
			<!-- Agency Header -->
			<div class="bg-white rounded-lg shadow-sm p-6 mb-8">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">{agency.name}</h1>
						<p class="text-gray-600 mt-2">
							{agency.agency_type === 'state_sponsored' ? 'State Sponsored Agency' : 'Private Recruitment Agency'}
						</p>
						{#if agency.contact_person}
							<p class="text-sm text-gray-500 mt-1">Contact: {agency.contact_person}</p>
						{/if}
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold text-indigo-600">{clients.length}</div>
						<div class="text-sm text-gray-500">Active Clients</div>
					</div>
				</div>
			</div>

			<!-- Clients Section -->
			<div class="bg-white rounded-lg shadow-sm">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-xl font-semibold text-gray-900">Your Clients</h2>
					<p class="text-gray-600 mt-1">Manage and track your clients' progress</p>
				</div>

				{#if clients.length === 0}
					<div class="p-8 text-center">
						<div class="text-gray-400 text-6xl mb-4">👥</div>
						<h3 class="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
						<p class="text-gray-600">Clients will appear here once they are assigned to your agency.</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Client
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Last Activity
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each clients as client}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex items-center">
												<div class="flex-shrink-0 h-10 w-10">
													<div class="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
														{client.users?.user_firstname?.charAt(0) || 'U'}
													</div>
												</div>
												<div class="ml-4">
													<div class="text-sm font-medium text-gray-900">
														{client.users?.user_firstname} {client.users?.user_lastname}
													</div>
													<div class="text-sm text-gray-500">
														{client.users?.user_email}
													</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
												getClientStatus(client.questionnaire_sessions) === 'completed' 
													? 'bg-green-100 text-green-800'
													: getClientStatus(client.questionnaire_sessions) === 'in-progress'
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-gray-100 text-gray-800'
											}">
												{getClientStatus(client.questionnaire_sessions)}
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{#if client.questionnaire_sessions && client.questionnaire_sessions.length > 0}
												{formatDate(client.questionnaire_sessions[client.questionnaire_sessions.length - 1].created_at)}
											{:else}
												No activity
											{/if}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<div class="flex space-x-2">
												{#if client.questionnaire_sessions && client.questionnaire_sessions.length > 0}
													<button
														on:click={() => generateClientSummary(client.user_id, client.questionnaire_sessions[client.questionnaire_sessions.length - 1].id)}
														class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
													>
														Generate Summary
													</button>
												{/if}
												<button
													on:click={() => goto(`/agency/${agencyId}/client/${client.user_id}`)}
													class="text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-md text-sm transition-colors"
												>
													View Details
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div> 