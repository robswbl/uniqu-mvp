<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { 
		getAgencySession, 
		validateAgencySession, 
		clearAgencySession,
		hasPermission,
		type AgencySession 
	} from '$lib/agencyAuth';

	let session: AgencySession | null = null;
	let isLoading = true;
	let error: string | null = null;
	let clients: any[] = [];
	let recentActivities: any[] = [];
	let stats = {
		totalClients: 0,
		activeClients: 0,
		completedQuestionnaires: 0,
		pendingActions: 0
	};

	onMount(async () => {
		try {
			console.log('Dashboard: onMount started');
			await checkAuthentication();
			if (session) {
				await loadDashboardData();
			}
		} catch (err) {
			console.error('Dashboard: onMount error:', err);
			error = err instanceof Error ? err.message : 'Unknown error occurred';
		}
	});

	async function checkAuthentication() {
		try {
			console.log('Dashboard: Checking authentication...');
			session = getAgencySession();
			console.log('Dashboard: Session data:', session);
			
			if (!session) {
				console.log('Dashboard: No session, redirecting to login');
				goto('/agency/login');
				return;
			}

			// Validate session against database
			console.log('Dashboard: Validating session...');
			const isValid = await validateAgencySession(session);
			console.log('Dashboard: Session validation result:', isValid);
			
			if (!isValid) {
				console.log('Dashboard: Invalid session, clearing and redirecting');
				await clearAgencySession(session);
				goto('/agency/login');
				return;
			}

			isLoading = false;
		} catch (error) {
			console.error('Dashboard: Authentication check error:', error);
			goto('/agency/login');
		}
	}

	async function loadDashboardData() {
		if (!session) return;

		try {
			console.log('Dashboard: Loading dashboard data...');
			// Load clients
			const { data: clientsData, error: clientsError } = await supabase
				.from('user_agencies')
				.select(`
					*,
					users!user_id (
						user_uuid,
						user_firstname,
						user_lastname,
						user_email,
						user_phone
					)
				`)
				.eq('agency_id', session.user.agencyId)
				.eq('is_active', true);

			if (clientsError) throw clientsError;
			clients = clientsData || [];

			// Load questionnaire sessions for stats
			const { data: sessionsData, error: sessionsError } = await supabase
				.from('questionnaire_sessions')
				.select('id, status, user_id')
				.in('user_id', clients.map(c => c.user_id));

			if (!sessionsError && sessionsData) {
				stats.totalClients = clients.length;
				stats.activeClients = sessionsData.filter(s => s.status === 'in-progress').length;
				stats.completedQuestionnaires = sessionsData.filter(s => s.status === 'completed').length;
				stats.pendingActions = sessionsData.filter(s => s.status === 'in-progress').length;
			}

			// Load recent activities
			const { data: activitiesData, error: activitiesError } = await supabase
				.from('agency_activities')
				.select('*')
				.eq('agency_id', session.user.agencyId)
				.order('created_at', { ascending: false })
				.limit(5);

			if (!activitiesError && activitiesData) {
				recentActivities = activitiesData;
			}
		} catch (error) {
			console.error('Dashboard: Error loading data:', error);
		}
	}



	function goToClient(clientId: string) {
		goto(`/agency/${session?.user.agencyId}/client/${clientId}`);
	}

	function goToClientList() {
		goto(`/agency/${session?.user.agencyId}`);
	}
</script>

<svelte:head>
	<title>Agency Dashboard</title>
</svelte:head>

{#if isLoading}
	<div class="flex items-center justify-center min-h-[400px]">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading dashboard...</p>
		</div>
	</div>
{:else if error}
	<div class="flex items-center justify-center min-h-[400px]">
		<div class="text-center">
			<div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
			<p class="text-gray-600 mb-4">{error}</p>
			<button 
				on:click={() => window.location.reload()} 
				class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
			>
				Try Again
			</button>
		</div>
	</div>
{:else if session}
	<div>


		<!-- Main Content -->
		<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Stats Grid -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
				<div class="bg-white rounded-lg shadow p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
								<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
								</svg>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Total Clients</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.totalClients}</p>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
								<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Active Clients</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.activeClients}</p>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
								<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
								</svg>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Completed</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.completedQuestionnaires}</p>
						</div>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow p-6">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
								<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-500">Pending</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.pendingActions}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="bg-white rounded-lg shadow mb-8">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Quick Actions</h2>
				</div>
				<div class="p-6">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<button
							on:click={goToClientList}
							class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
						>
							<svg class="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							<div class="text-left">
								<p class="font-medium text-gray-900">View All Clients</p>
								<p class="text-sm text-gray-500">Manage your client portfolio</p>
							</div>
						</button>

						{#if hasPermission(session, 'clients.write')}
							<button
								on:click={() => goto('/create-user')}
								class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<svg class="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
								</svg>
								<div class="text-left">
									<p class="font-medium text-gray-900">Add New Client</p>
									<p class="text-sm text-gray-500">Create a new client account</p>
								</div>
							</button>
						{/if}

						{#if hasPermission(session, 'reports.read')}
							<button
								on:click={() => goto('/admin')}
								class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
							>
								<svg class="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
								<div class="text-left">
									<p class="font-medium text-gray-900">View Reports</p>
									<p class="text-sm text-gray-500">Access analytics and insights</p>
								</div>
							</button>
						{/if}
					</div>
				</div>
			</div>

			<!-- Recent Clients -->
			<div class="bg-white rounded-lg shadow mb-8">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Recent Clients</h2>
				</div>
				<div class="overflow-hidden">
					{#if clients.length === 0}
						<div class="p-6 text-center text-gray-500">
							<p>No clients found. Start by adding your first client.</p>
						</div>
					{:else}
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Client
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Contact
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each clients.slice(0, 5) as client}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex items-center">
												<div class="h-10 w-10 flex-shrink-0">
													<div class="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
														<span class="text-sm font-medium text-white">
															{client.users?.user_firstname?.charAt(0) || 'U'}
														</span>
													</div>
												</div>
												<div class="ml-4">
													<div class="text-sm font-medium text-gray-900">
														{client.users?.user_firstname} {client.users?.user_lastname}
													</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="text-sm text-gray-900">{client.users?.user_email}</div>
											<div class="text-sm text-gray-500">{client.users?.user_phone || 'No phone'}</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
												Active
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
											<button
												on:click={() => goToClient(client.user_id)}
												class="text-indigo-600 hover:text-indigo-900"
											>
												View Details
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{/if}
				</div>
			</div>

			<!-- Recent Activities -->
			{#if recentActivities.length > 0}
				<div class="bg-white rounded-lg shadow">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-lg font-medium text-gray-900">Recent Activities</h2>
					</div>
					<div class="p-6">
						<div class="flow-root">
							<ul class="-mb-8">
								{#each recentActivities as activity, index}
									<li>
										<div class="relative pb-8">
											{#if index !== recentActivities.length - 1}
												<span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
											{/if}
											<div class="relative flex space-x-3">
												<div>
													<span class="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
														<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
														</svg>
													</span>
												</div>
												<div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
													<div>
														<p class="text-sm text-gray-500">
															{activity.description || 'Activity performed'}
														</p>
													</div>
													<div class="text-right text-sm whitespace-nowrap text-gray-500">
														<time datetime={activity.created_at}>
															{new Date(activity.created_at).toLocaleDateString()}
														</time>
													</div>
												</div>
											</div>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
{/if}
