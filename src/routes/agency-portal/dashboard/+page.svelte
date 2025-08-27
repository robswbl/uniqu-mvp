<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let session: any = null;
	let isLoading = true;
	let stats = {
		totalClients: 0,
		activeClients: 0,
		completedQuestionnaires: 0,
		pendingActions: 0
	};

	onMount(() => {
		checkSession();
	});

	async function checkSession() {
		const sessionData = localStorage.getItem('agencySession');
		if (!sessionData) {
			goto('/agency-portal/login');
			return;
		}

		try {
			session = JSON.parse(sessionData);
			
			// Check if session is expired
			if (new Date(session.expiresAt) < new Date()) {
				localStorage.removeItem('agencySession');
				goto('/agency-portal/login');
				return;
			}

			// Validate session with database
			const { data: validSession, error } = await supabase
				.from('agency_sessions')
				.select('*')
				.eq('session_token', session.token)
				.eq('agency_user_id', session.user.id)
				.gt('expires_at', new Date().toISOString())
				.single();

			if (error || !validSession) {
				localStorage.removeItem('agencySession');
				goto('/agency-portal/login');
				return;
			}

			await loadDashboardData();
		} catch (error) {
			console.error('Session validation error:', error);
			goto('/agency-portal/login');
		} finally {
			isLoading = false;
		}
	}

	async function loadDashboardData() {
		try {
			// Load basic stats (placeholder for now)
			// TODO: Implement actual client data loading
			stats = {
				totalClients: 0,
				activeClients: 0,
				completedQuestionnaires: 0,
				pendingActions: 0
			};
		} catch (error) {
			console.error('Error loading dashboard data:', error);
		}
	}

	async function handleLogout() {
		if (session?.token) {
			try {
				// Remove session from database
				await supabase
					.from('agency_sessions')
					.delete()
					.eq('session_token', session.token);
			} catch (error) {
				console.error('Error removing session:', error);
			}
		}
		
		// Clear localStorage
		localStorage.removeItem('agencySession');
		
		// Redirect to login
		goto('/agency-portal/login');
	}
</script>

<svelte:head>
	<title>{$t('agency.dashboard.title')}</title>
</svelte:head>

{#if isLoading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">{$t('agency.dashboard.loading')}</p>
		</div>
	</div>
{:else if session}
	<div class="space-y-8">
		<!-- Welcome Header -->
		<div class="bg-white rounded-lg shadow p-6">
			<div class="flex justify-between items-start">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">
						{$t('agency.dashboard.welcome')}, {session.user.firstName}!
					</h1>
					<p class="text-gray-600 mt-2">
						{$t('agency.dashboard.role')}: {session.user.role} • {session.user.agencyName}
					</p>
				</div>
				<button
					on:click={handleLogout}
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
				>
					{$t('common.logout')}
				</button>
			</div>
		</div>

		<!-- Stats Overview -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
						<p class="text-sm font-medium text-gray-500">{$t('agency.dashboard.total_clients')}</p>
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
						<p class="text-sm font-medium text-gray-500">{$t('agency.dashboard.active_clients')}</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.activeClients}</p>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow p-6">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
							<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
					</div>
					<div class="ml-4">
						<p class="text-sm font-medium text-gray-500">{$t('agency.dashboard.completed_questionnaires')}</p>
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
						<p class="text-sm font-medium text-gray-500">{$t('agency.dashboard.pending_actions')}</p>
						<p class="text-2xl font-semibold text-gray-900">{stats.pendingActions}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">{$t('agency.dashboard.quick_actions')}</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<button class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
					<svg class="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					<span class="text-sm font-medium text-gray-900">{$t('agency.dashboard.add_client')}</span>
				</button>
				
				<button class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
					<svg class="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
					<span class="text-sm font-medium text-gray-900">{$t('agency.dashboard.view_reports')}</span>
				</button>
				
				<button class="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
					<svg class="w-6 h-6 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					<span class="text-sm font-medium text-gray-900">{$t('agency.dashboard.settings')}</span>
				</button>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-medium text-gray-900 mb-4">{$t('agency.dashboard.recent_activity')}</h2>
			<div class="space-y-4">
				<div class="flex items-center p-4 bg-gray-50 rounded-lg">
					<div class="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
					<div class="flex-1">
						<p class="text-sm text-gray-900">{$t('agency.dashboard.no_recent_activity')}</p>
						<p class="text-xs text-gray-500">{$t('agency.dashboard.activity_will_appear_here')}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
