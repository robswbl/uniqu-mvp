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

	// Agency performance metrics
	let agencyPerformance = {
		totalDocuments: 0,
		totalApplicationLetters: 0,
		applicationFunnel: {
			created: 0,
			sent: 0,
			responded: 0,
			interview: 0,
			rejected: 0,
			accepted: 0,
			sentPercentage: 0,
			respondedPercentage: 0,
			interviewPercentage: 0,
			rejectedPercentage: 0,
			acceptedPercentage: 0,
			conversionRate: 0,
			successRate: 0
		},
		clientSummaries: {
			total: 0,
			completed: 0,
			generating: 0,
			failed: 0
		},
		monthlyGrowth: {
			newClients: 0,
			completedSessions: 0,
			generatedDocuments: 0
		}
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

			// Load agency performance data
			await loadAgencyPerformanceData();

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

	async function loadAgencyPerformanceData() {
		if (!session) return;

		try {
			const clientIds = clients.map(c => c.user_id);
			if (clientIds.length === 0) {
				// Initialize with zeros if no clients
				agencyPerformance = {
					totalDocuments: 0,
					totalApplicationLetters: 0,
					applicationFunnel: {
						created: 0,
						sent: 0,
						responded: 0,
						interview: 0,
						rejected: 0,
						accepted: 0,
						sentPercentage: 0,
						respondedPercentage: 0,
						interviewPercentage: 0,
						rejectedPercentage: 0,
						acceptedPercentage: 0,
						conversionRate: 0,
						successRate: 0
					},
					clientSummaries: {
						total: 0,
						completed: 0,
						generating: 0,
						failed: 0
					},
					monthlyGrowth: {
						newClients: 0,
						completedSessions: 0,
						generatedDocuments: 0
					}
				};
				return;
			}

			// Load all documents across all clients - need to get session IDs first
			const { data: sessionsData, error: sessionsError } = await supabase
				.from('questionnaire_sessions')
				.select('id, user_id')
				.in('user_id', clientIds);

			let documentsData: any[] = [];
			let lettersData: any[] = [];

			if (!sessionsError && sessionsData) {
				const sessionIds = sessionsData.map(s => s.id);
				
				// Load all documents across all client sessions
				const { data: docsData, error: documentsError } = await supabase
					.from('generated_documents')
					.select('*')
					.in('session_id', sessionIds);

				if (!documentsError && docsData) {
					documentsData = docsData;
					agencyPerformance.totalDocuments = documentsData.length;
				}

				// Load all application letters across all client sessions
				const { data: letters, error: lettersError } = await supabase
					.from('application_letters')
					.select('*')
					.in('session_id', sessionIds);

				if (!lettersError && letters) {
					lettersData = letters;
					agencyPerformance.totalApplicationLetters = lettersData.length;
					
					// Calculate application funnel metrics
					const total = lettersData.length;
					const sent = lettersData.filter((letter: any) => letter.status === 'sent').length;
					const responded = lettersData.filter((letter: any) => letter.status === 'responded').length;
					const interview = lettersData.filter((letter: any) => letter.status === 'interview').length;
					const rejected = lettersData.filter((letter: any) => letter.status === 'rejected').length;
					const accepted = lettersData.filter((letter: any) => letter.status === 'accepted').length;

					agencyPerformance.applicationFunnel = {
						created: total,
						sent,
						responded,
						interview,
						rejected,
						accepted,
						sentPercentage: total > 0 ? Math.round((sent / total) * 100) : 0,
						respondedPercentage: total > 0 ? Math.round((responded / total) * 100) : 0,
						interviewPercentage: total > 0 ? Math.round((interview / total) * 100) : 0,
						rejectedPercentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
						acceptedPercentage: total > 0 ? Math.round((accepted / total) * 100) : 0,
						conversionRate: sent > 0 ? Math.round((interview / sent) * 100) : 0,
						successRate: interview > 0 ? Math.round((accepted / interview) * 100) : 0
					};
				}
			}

			// Load all client summaries across all clients
			const { data: summariesData, error: summariesError } = await supabase
				.from('client_summaries')
				.select('*')
				.eq('agency_id', session.user.agencyId);

			if (!summariesError && summariesData) {
				agencyPerformance.clientSummaries.total = summariesData.length;
				agencyPerformance.clientSummaries.completed = summariesData.filter((s: any) => s.status === 'completed').length;
				agencyPerformance.clientSummaries.generating = summariesData.filter((s: any) => s.status === 'generating').length;
				agencyPerformance.clientSummaries.failed = summariesData.filter((s: any) => s.status === 'failed').length;
			}

			// Calculate monthly growth (last 30 days)
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			// New clients in last 30 days
			const newClients = clients.filter((c: any) => new Date(c.created_at) >= thirtyDaysAgo).length;
			agencyPerformance.monthlyGrowth.newClients = newClients;

			// Load sessions data for monthly growth calculation
			const { data: monthlySessionsData, error: monthlySessionsError } = await supabase
				.from('questionnaire_sessions')
				.select('id, status, user_id, created_at')
				.in('user_id', clientIds);

			// Completed sessions in last 30 days
			if (!monthlySessionsError && monthlySessionsData) {
				const recentSessions = monthlySessionsData.filter((s: any) => 
					s.status === 'completed' && new Date(s.created_at) >= thirtyDaysAgo
				);
				agencyPerformance.monthlyGrowth.completedSessions = recentSessions.length;
			}

			// Generated documents in last 30 days
			if (documentsData) {
				const recentDocuments = documentsData.filter((d: any) => 
					new Date(d.created_at) >= thirtyDaysAgo
				);
				agencyPerformance.monthlyGrowth.generatedDocuments = recentDocuments.length;
			}

		} catch (error) {
			console.error('Dashboard: Error loading agency performance data:', error);
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
							<p class="text-sm font-medium text-gray-500">Completed Sessions</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.completedQuestionnaires}</p>
							<p class="text-xs text-gray-500">Questionnaires finished</p>
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
							<p class="text-sm font-medium text-gray-500">Total Documents</p>
							<p class="text-2xl font-semibold text-gray-900">{agencyPerformance.totalDocuments}</p>
							<p class="text-xs text-gray-500">Generated for clients</p>
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
							<p class="text-sm font-medium text-gray-500">In Progress</p>
							<p class="text-2xl font-semibold text-gray-900">{stats.pendingActions}</p>
							<p class="text-xs text-gray-500">Sessions ongoing</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Agency Performance Dashboard -->
			<div class="bg-white rounded-lg shadow mb-8">
				<div class="px-6 py-4 border-b border-gray-200">
					<h2 class="text-lg font-medium text-gray-900">Agency Performance Dashboard</h2>
					<p class="text-sm text-gray-600">Overview of your agency's performance across all clients</p>
				</div>
				<div class="p-6">
					<!-- Performance Metrics Grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
						<div class="text-center">
							<div class="text-3xl font-bold text-blue-600">{agencyPerformance.totalDocuments}</div>
							<div class="text-sm text-gray-600">Total Documents</div>
							<div class="text-xs text-gray-500">Generated across all clients</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-bold text-indigo-600">{agencyPerformance.totalApplicationLetters}</div>
							<div class="text-sm text-gray-600">Application Letters</div>
							<div class="text-xs text-gray-500">Created for clients</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-bold text-green-600">{agencyPerformance.clientSummaries.completed}</div>
							<div class="text-sm text-gray-600">Client Summaries</div>
							<div class="text-xs text-gray-500">Successfully generated</div>
						</div>
						<div class="text-center">
							<div class="text-3xl font-bold text-purple-600">{agencyPerformance.monthlyGrowth.newClients}</div>
							<div class="text-sm text-gray-600">New Clients</div>
							<div class="text-xs text-gray-500">Last 30 days</div>
						</div>
					</div>

					<!-- Application Funnel Visualization -->
					<div class="mb-8">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Application Funnel Performance</h3>
						<div class="flex flex-col items-center space-y-4">
							<!-- Created -->
							<div class="flex w-full max-w-md items-center justify-between rounded-lg bg-blue-50 p-4">
								<div class="flex items-center space-x-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
										<span class="text-lg font-bold text-blue-600">📝</span>
									</div>
									<div>
										<p class="font-medium text-blue-900">Created</p>
										<p class="text-sm text-blue-600">Application Letters</p>
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-bold text-blue-600">{agencyPerformance.applicationFunnel.created}</div>
									<div class="text-xs text-blue-500">Total</div>
								</div>
							</div>

							<!-- Arrow -->
							<div class="flex h-6 w-6 items-center justify-center text-gray-400">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
								</svg>
							</div>

							<!-- Sent -->
							<div class="flex w-full max-w-md items-center justify-between rounded-lg bg-indigo-50 p-4">
								<div class="flex items-center space-x-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
										<span class="text-lg font-bold text-indigo-600">📤</span>
									</div>
									<div>
										<p class="font-medium text-indigo-900">Sent</p>
										<p class="text-sm text-indigo-600">Applications Sent</p>
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-bold text-indigo-600">{agencyPerformance.applicationFunnel.sent}</div>
									<div class="text-xs text-indigo-500">{agencyPerformance.applicationFunnel.sentPercentage}%</div>
								</div>
							</div>

							<!-- Arrow -->
							<div class="flex h-6 w-6 items-center justify-center text-gray-400">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
								</svg>
							</div>

							<!-- Responses -->
							<div class="flex w-full max-w-md items-center justify-between rounded-lg bg-yellow-50 p-4">
								<div class="flex items-center space-x-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
										<span class="text-lg font-bold text-yellow-600">📨</span>
									</div>
									<div>
										<p class="font-medium text-yellow-900">Responses</p>
										<p class="text-sm text-yellow-600">Replies Received</p>
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-bold text-yellow-600">{agencyPerformance.applicationFunnel.responded}</div>
									<div class="text-xs text-yellow-500">{agencyPerformance.applicationFunnel.respondedPercentage}%</div>
								</div>
							</div>

							<!-- Arrow -->
							<div class="flex h-6 w-6 items-center justify-center text-gray-400">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
								</svg>
							</div>

							<!-- Interviews -->
							<div class="flex w-full max-w-md items-center justify-between rounded-lg bg-green-50 p-4">
								<div class="flex items-center space-x-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
										<span class="text-lg font-bold text-green-600">🤝</span>
									</div>
									<div>
										<p class="font-medium text-green-900">Interviews</p>
										<p class="text-sm text-green-600">Scheduled</p>
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-bold text-green-600">{agencyPerformance.applicationFunnel.interview}</div>
									<div class="text-xs text-green-500">{agencyPerformance.applicationFunnel.interviewPercentage}%</div>
								</div>
							</div>

							<!-- Arrow -->
							<div class="flex h-6 w-6 items-center justify-center text-gray-400">
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
								</svg>
							</div>

							<!-- Outcomes Row -->
							<div class="flex w-full max-w-md space-x-4">
								<!-- Rejections -->
								<div class="flex-1 rounded-lg bg-red-50 p-4 text-center">
									<div class="mb-2 text-2xl font-bold text-red-600">{agencyPerformance.applicationFunnel.rejected}</div>
									<div class="text-sm font-medium text-red-900">Rejections</div>
									<div class="text-xs text-red-500">{agencyPerformance.applicationFunnel.rejectedPercentage}%</div>
								</div>

								<!-- Offers -->
								<div class="flex-1 rounded-lg bg-purple-50 p-4 text-center">
									<div class="mb-2 text-2xl font-bold text-purple-600">{agencyPerformance.applicationFunnel.accepted}</div>
									<div class="text-sm font-medium text-purple-900">Offers</div>
									<div class="text-xs text-purple-500">{agencyPerformance.applicationFunnel.acceptedPercentage}%</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Conversion Rates -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="bg-gray-50 rounded-lg p-4 text-center">
							<div class="text-2xl font-bold text-gray-900">{agencyPerformance.applicationFunnel.conversionRate}%</div>
							<div class="text-sm font-medium text-gray-700">Conversion Rate</div>
							<div class="text-xs text-gray-500">Sent to Interview</div>
						</div>
						<div class="bg-gray-50 rounded-lg p-4 text-center">
							<div class="text-2xl font-bold text-gray-900">{agencyPerformance.applicationFunnel.successRate}%</div>
							<div class="text-sm font-medium text-gray-700">Success Rate</div>
							<div class="text-xs text-gray-500">Interview to Offer</div>
						</div>
					</div>

					<!-- Client Summary Status Breakdown -->
					<div class="mt-8 pt-6 border-t border-gray-200">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Client Summary Status</h3>
						<p class="text-sm text-gray-600 mb-4">Overview of AI-generated client summaries across all clients</p>
						<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div class="bg-green-50 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-green-600">{agencyPerformance.clientSummaries.completed}</div>
								<div class="text-sm font-medium text-green-900">Completed</div>
								<div class="text-xs text-green-600">Ready for use</div>
							</div>
							<div class="bg-yellow-50 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-yellow-600">{agencyPerformance.clientSummaries.generating}</div>
								<div class="text-sm font-medium text-yellow-900">Generating</div>
								<div class="text-xs text-yellow-600">In progress</div>
							</div>
							<div class="bg-red-50 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-red-600">{agencyPerformance.clientSummaries.failed}</div>
								<div class="text-sm font-medium text-red-900">Failed</div>
								<div class="text-xs text-red-600">Needs attention</div>
							</div>
							<div class="bg-gray-50 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-gray-600">{agencyPerformance.clientSummaries.total}</div>
								<div class="text-sm font-medium text-gray-900">Total</div>
								<div class="text-xs text-gray-600">All summaries</div>
							</div>
						</div>
					</div>

					<!-- Monthly Growth Trends -->
					<div class="mt-8 pt-6 border-t border-gray-200">
						<h3 class="text-lg font-medium text-gray-900 mb-4">Monthly Growth Trends</h3>
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-blue-600">+{agencyPerformance.monthlyGrowth.newClients}</div>
								<div class="text-sm font-medium text-blue-900">New Clients</div>
								<div class="text-xs text-blue-600">Last 30 days</div>
							</div>
							<div class="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-green-600">+{agencyPerformance.monthlyGrowth.completedSessions}</div>
								<div class="text-sm font-medium text-green-900">Completed Sessions</div>
								<div class="text-xs text-green-600">Last 30 days</div>
							</div>
							<div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 text-center">
								<div class="text-2xl font-bold text-purple-600">+{agencyPerformance.monthlyGrowth.generatedDocuments}</div>
								<div class="text-sm font-medium text-purple-900">Generated Documents</div>
								<div class="text-xs text-purple-600">Last 30 days</div>
							</div>
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
