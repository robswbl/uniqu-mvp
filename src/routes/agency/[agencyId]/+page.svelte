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
				.select(
					`
					*,
					users!user_id (
						user_uuid,
						user_firstname,
						user_lastname,
						user_email,
						user_phone
					)
				`
				)
				.eq('agency_id', agencyId)
				.eq('is_active', true);

			if (clientsError) throw clientsError;
			clients = clientsData || [];

			// Load questionnaire sessions separately for each client
			for (let client of clients) {
				const { data: sessionsData, error: sessionsError } = await supabase
					.from('questionnaire_sessions')
					.select('id, status, created_at, completed_at')
					.eq('user_id', client.user_id)
					.order('created_at', { ascending: false });

				if (!sessionsError && sessionsData) {
					client.questionnaire_sessions = sessionsData;
				} else {
					client.questionnaire_sessions = [];
				}
			}
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
			const response = await fetch(
				'https://manage.app.n8n.cloud/webhook/clients/uniqu-agentsummary',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						user_id: userId,
						session_id: sessionId,
						agency_id: agencyId
					})
				}
			);

			if (response.ok) {
				// Log the activity
				await supabase.from('agency_activities').insert({
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
	<div class="mx-auto max-w-7xl px-4 py-8">
		{#if loading}
			<div class="flex h-64 items-center justify-center">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<h3 class="font-medium text-red-800">Error</h3>
				<p class="text-red-600">{error}</p>
			</div>
		{:else}
			<!-- Agency Header -->
			<div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-gray-900">{agency.name}</h1>
						<p class="mt-2 text-gray-600">
							{agency.agency_type === 'state_sponsored'
								? 'State Sponsored Agency'
								: 'Private Recruitment Agency'}
						</p>
						{#if agency.contact_person}
							<p class="mt-1 text-sm text-gray-500">Contact: {agency.contact_person}</p>
						{/if}
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold text-indigo-600">{clients.length}</div>
						<div class="text-sm text-gray-500">Active Clients</div>
					</div>
				</div>
			</div>

			<!-- Clients Section -->
			<div class="rounded-lg bg-white shadow-sm">
				<div class="border-b border-gray-200 px-6 py-4">
					<h2 class="text-xl font-semibold text-gray-900">Your Clients</h2>
					<p class="mt-1 text-gray-600">Manage and track your clients' progress</p>
				</div>

				{#if clients.length === 0}
					<div class="p-8 text-center">
						<div class="mb-4 text-6xl text-gray-400">👥</div>
						<h3 class="mb-2 text-lg font-medium text-gray-900">No clients yet</h3>
						<p class="text-gray-600">
							Clients will appear here once they are assigned to your agency.
						</p>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Client
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Status
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Last Activity
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each clients as client}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex items-center">
												<div class="h-10 w-10 flex-shrink-0">
													<div
														class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white"
													>
														{client.users?.user_firstname?.charAt(0) || 'U'}
													</div>
												</div>
												<div class="ml-4">
													<div class="text-sm font-medium text-gray-900">
														{client.users?.user_firstname}
														{client.users?.user_lastname}
													</div>
													<div class="text-sm text-gray-500">
														{client.users?.user_email}
													</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getClientStatus(
													client.questionnaire_sessions
												) === 'completed'
													? 'bg-green-100 text-green-800'
													: getClientStatus(client.questionnaire_sessions) === 'in-progress'
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-gray-100 text-gray-800'}"
											>
												{getClientStatus(client.questionnaire_sessions)}
											</span>
										</td>
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
											{#if client.questionnaire_sessions && client.questionnaire_sessions.length > 0}
												{formatDate(
													client.questionnaire_sessions[client.questionnaire_sessions.length - 1]
														.created_at
												)}
											{:else}
												No activity
											{/if}
										</td>
										<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
											<div class="flex space-x-2">
												{#if client.questionnaire_sessions && client.questionnaire_sessions.length > 0}
													<button
														on:click={() =>
															generateClientSummary(
																client.user_id,
																client.questionnaire_sessions[
																	client.questionnaire_sessions.length - 1
																].id
															)}
														class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
													>
														Generate Summary
													</button>
												{/if}
												<button
													on:click={() => goto(`/agency/${agencyId}/client/${client.user_id}`)}
													class="rounded-md bg-gray-50 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
