<!-- src/routes/agency/[agencyId]/client/[userId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';
	import { goto } from '$app/navigation';

	export let data;
	const { agencyId, userId } = data;

	let client: any = null;
	let sessions: any[] = [];
	let activities: any[] = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		await loadClientData();
	});

	async function loadClientData() {
		try {
			loading = true;

			// Load client details
			const { data: clientData, error: clientError } = await supabase
				.from('users')
				.select('*')
				.eq('user_uuid', userId)
				.single();

			if (clientError) throw clientError;
			client = clientData;

			// Load client's questionnaire sessions
			const { data: sessionsData, error: sessionsError } = await supabase
				.from('questionnaire_sessions')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false });

			if (sessionsError) throw sessionsError;
			sessions = sessionsData || [];

			// Load agency activities for this client
			const { data: activitiesData, error: activitiesError } = await supabase
				.from('agency_activities')
				.select('*')
				.eq('agency_id', agencyId)
				.eq('user_id', userId)
				.order('created_at', { ascending: false });

			if (activitiesError) throw activitiesError;
			activities = activitiesData || [];

		} catch (err: any) {
			error = err.message;
			console.error('Error loading client data:', err);
		} finally {
			loading = false;
		}
	}

	async function generateClientSummary(sessionId: string) {
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
				// Reload activities
				await loadClientData();
			} else {
				throw new Error('Failed to generate summary');
			}
		} catch (err: any) {
			alert('Error generating summary: ' + err.message);
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
	}

	function getStatusBadge(status: string) {
		const statusConfig: Record<string, { class: string; text: string }> = {
			'completed': { class: 'bg-green-100 text-green-800', text: 'Completed' },
			'in-progress': { class: 'bg-yellow-100 text-yellow-800', text: 'In Progress' },
			'not_started': { class: 'bg-gray-100 text-gray-800', text: 'Not Started' }
		};
		const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-800', text: status };
		return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}">${config.text}</span>`;
	}

	function getActivityIcon(activityType: string) {
		const icons: Record<string, string> = {
			'user_registered': '👤',
			'questionnaire_started': '📝',
			'questionnaire_completed': '✅',
			'results_generated': '📊',
			'application_letter_created': '📄',
			'profile_updated': '🔄',
			'login': '🔑'
		};
		return icons[activityType] || '📋';
	}
</script>

<svelte:head>
	<title>Client Details - {client?.user_firstname || 'Loading...'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-7xl mx-auto px-4 py-8">
		<!-- Back Button -->
		<button 
			on:click={() => goto(`/agency/${agencyId}`)}
			class="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 mb-6"
			type="button"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Agency Dashboard
		</button>

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
			<!-- Client Header -->
			<div class="bg-white rounded-lg shadow-sm p-6 mb-8">
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<div class="flex-shrink-0 h-16 w-16">
							<div class="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
								{client?.user_firstname?.charAt(0) || 'U'}
							</div>
						</div>
						<div class="ml-6">
							<h1 class="text-3xl font-bold text-gray-900">
								{client?.user_firstname} {client?.user_lastname}
							</h1>
							<p class="text-gray-600 mt-1">{client?.user_email}</p>
							{#if client?.user_phone}
								<p class="text-gray-500 text-sm mt-1">📞 {client.user_phone}</p>
							{/if}
						</div>
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold text-indigo-600">{sessions.length}</div>
						<div class="text-sm text-gray-500">Sessions</div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Sessions Section -->
				<div class="bg-white rounded-lg shadow-sm">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold text-gray-900">Questionnaire Sessions</h2>
						<p class="text-gray-600 mt-1">Track client progress through questionnaires</p>
					</div>

					{#if sessions.length === 0}
						<div class="p-8 text-center">
							<div class="text-gray-400 text-4xl mb-4">📝</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
							<p class="text-gray-600">Client hasn't started any questionnaires.</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each sessions as session}
								<div class="p-6">
									<div class="flex items-center justify-between">
										<div>
											<div class="flex items-center space-x-2">
												<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {
													session.status === 'completed' 
														? 'bg-green-100 text-green-800'
														: session.status === 'in-progress'
														? 'bg-yellow-100 text-yellow-800'
														: 'bg-gray-100 text-gray-800'
												}">
													{session.status}
												</span>
												<span class="text-sm text-gray-500">
													{formatDate(session.created_at)}
												</span>
											</div>
											<p class="text-sm text-gray-600 mt-1">
												Session ID: {session.id}
											</p>
										</div>
										<div class="flex space-x-2">
											{#if session.status === 'completed'}
												<button
													on:click={() => generateClientSummary(session.id)}
													class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
												>
													Generate Summary
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Activities Section -->
				<div class="bg-white rounded-lg shadow-sm">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold text-gray-900">Agency Activities</h2>
						<p class="text-gray-600 mt-1">Track all interactions with this client</p>
					</div>

					{#if activities.length === 0}
						<div class="p-8 text-center">
							<div class="text-gray-400 text-4xl mb-4">📊</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">No activities yet</h3>
							<p class="text-gray-600">Activities will appear here as you interact with this client.</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each activities as activity}
								<div class="p-6">
									<div class="flex items-start space-x-3">
										<div class="flex-shrink-0 text-2xl">
											{getActivityIcon(activity.activity_type)}
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm font-medium text-gray-900">
												{activity.activity_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
											</p>
											<p class="text-sm text-gray-500">
												{formatDate(activity.created_at)}
											</p>
											{#if activity.metadata}
												<p class="text-xs text-gray-400 mt-1">
													{JSON.stringify(activity.metadata)}
												</p>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div> 