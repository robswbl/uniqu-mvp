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
	let documents: any[] = [];
	let applicationLetters: any[] = [];
	let loading = true;
	let error = '';
	let selectedVersions: Record<string, string> = {};

	// Main document types to show
	const mainDocumentTypes = ['reflection_letter', 'career_themes', 'ideal_companies', 'matching_companies'];

	// Group documents by type and get latest version for each
	function getDocumentsByType() {
		const grouped: Record<string, any[]> = {};
		
		// Group generated documents
		documents.forEach(doc => {
			if (mainDocumentTypes.includes(doc.document_type)) {
				if (!grouped[doc.document_type]) {
					grouped[doc.document_type] = [];
				}
				grouped[doc.document_type].push(doc);
			}
		});

		// Group application letters
		if (applicationLetters.length > 0) {
			grouped['application_letters'] = applicationLetters;
		}

		return grouped;
	}

	function getLatestDocument(type: string) {
		const docs = getDocumentsByType()[type];
		if (!docs || docs.length === 0) return null;
		
		// Sort by created_at descending and return the latest
		return docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
	}

	function getDocumentVersions(type: string) {
		const docs = getDocumentsByType()[type];
		if (!docs) return [];
		
		return docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.map((doc, index) => ({
				id: doc.id,
				version: `v${index + 1}`,
				date: new Date(doc.created_at).toLocaleDateString() + ' ' + new Date(doc.created_at).toLocaleTimeString(),
				document: doc
			}));
	}

	function getSelectedDocument(type: string) {
		const versions = getDocumentVersions(type);
		const selectedId = selectedVersions[type];
		
		if (selectedId) {
			return versions.find(v => v.document.id === selectedId)?.document;
		}
		
		// Default to latest
		return getLatestDocument(type);
	}

	function viewDocument(type: string) {
		const doc = getSelectedDocument(type);
		if (!doc) return;
		
		if (type === 'application_letters') {
			// For application letters, we need to handle differently
			const letter = doc;
			window.open(`/results/${sessions[0]?.id}/application_letter?company=${letter.company_name}`, '_blank');
		} else {
			window.open(`/results/${sessions[0]?.id}/${type}`, '_blank');
		}
	}

	function copyDocument(type: string) {
		const doc = getSelectedDocument(type);
		if (!doc) return;
		
		// For now, just copy the URL
		let url = '';
		if (type === 'application_letters') {
			url = `${window.location.origin}/results/${sessions[0]?.id}/application_letter?company=${doc.company_name}`;
		} else {
			url = `${window.location.origin}/results/${sessions[0]?.id}/${type}`;
		}
		
		navigator.clipboard.writeText(url).then(() => {
			alert('Document URL copied to clipboard!');
		}).catch(() => {
			alert('Failed to copy URL. Please copy manually: ' + url);
		});
	}

	function printDocument(type: string) {
		const doc = getSelectedDocument(type);
		if (!doc) return;
		
		// Open in new window for printing
		let url = '';
		if (type === 'application_letters') {
			url = `/results/${sessions[0]?.id}/application_letter?company=${doc.company_name}`;
		} else {
			url = `/results/${sessions[0]?.id}/${type}`;
		}
		
		const printWindow = window.open(url, '_blank');
		if (printWindow) {
			printWindow.onload = () => {
				printWindow.print();
			};
		}
	}

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

			// Load all generated documents for this client
			const { data: documentsData, error: documentsError } = await supabase
				.from('generated_documents')
				.select('*')
				.eq('session_id', sessions[0]?.id) // Get documents for the most recent session
				.order('created_at', { ascending: false });

			if (!documentsError && documentsData) {
				documents = documentsData;
			}

			// Load application letters for this client
			const { data: lettersData, error: lettersError } = await supabase
				.from('application_letters')
				.select('*')
				.eq('session_id', sessions[0]?.id) // Get letters for the most recent session
				.order('created_at', { ascending: false });

			if (!lettersError && lettersData) {
				applicationLetters = lettersData;
			}

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

	function getDocumentIcon(documentType: string): string {
		const icons: Record<string, string> = {
			'reflection_letter': '📝',
			'career_themes': '🎯',
			'ideal_companies': '🏢',
			'matching_companies': '🔍',
			'application_letter': '📄'
		};
		return icons[documentType] || '📋';
	}

	function getDocumentTitle(documentType: string): string {
		const titles: Record<string, string> = {
			'reflection_letter': 'Reflection Letter',
			'career_themes': 'Career Themes',
			'ideal_companies': 'Ideal Companies',
			'matching_companies': 'Matching Companies',
			'application_letter': 'Application Letter'
		};
		return titles[documentType] || documentType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
	}

	function getDocumentCount(): number {
		return documents.length + applicationLetters.length;
	}

	function formatActivityMetadata(metadata: any): string {
		if (!metadata) return '';
		
		const action = metadata.action;
		switch (action) {
			case 'summary_generated':
				return 'Summary generation was triggered';
			case 'user_assigned':
				const assignedBy = metadata.assigned_by || 'system';
				const relationshipType = metadata.relationship_type || 'client';
				return `Client assigned as ${relationshipType} by ${assignedBy}`;
			case 'client_contacted':
				return 'Client was contacted';
			case 'meeting_scheduled':
				return 'Meeting was scheduled';
			case 'feedback_received':
				return 'Feedback was received from client';
			case 'follow_up_sent':
				return 'Follow-up message was sent';
			default:
				return `Action: ${action}`;
		}
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
						<div class="text-2xl font-bold text-indigo-600">{getDocumentCount()}</div>
						<div class="text-sm text-gray-500">Documents</div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Documents Section -->
				<div class="bg-white rounded-lg shadow-sm">
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 class="text-xl font-semibold text-gray-900">Generated Documents</h2>
						<p class="text-gray-600 mt-1">All career analysis documents and application letters</p>
					</div>

					{#if documents.length === 0 && applicationLetters.length === 0}
						<div class="p-8 text-center">
							<div class="text-gray-400 text-4xl mb-4">📄</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
							<p class="text-gray-600">Documents will appear here once generated.</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each mainDocumentTypes as type}
								{#if getLatestDocument(type)}
									<div class="p-6">
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-3">
												<span class="text-2xl">{getDocumentIcon(type)}</span>
												<div>
													<h4 class="font-medium text-gray-900">{getDocumentTitle(type)}</h4>
													{#if getDocumentVersions(type).length > 1}
														<div class="flex items-center space-x-2 mt-1">
															<select 
																bind:value={selectedVersions[type]}
																class="text-xs border border-gray-300 rounded px-2 py-1"
															>
																{#each getDocumentVersions(type) as version}
																	<option value={version.document.id}>
																		{version.version} - {version.date}
																	</option>
																{/each}
															</select>
															<span class="text-xs text-gray-500">
																{getDocumentVersions(type).length} versions
															</span>
														</div>
													{:else}
														<p class="text-sm text-gray-500">
															Latest: {formatDate(getLatestDocument(type).created_at)}
														</p>
													{/if}
												</div>
											</div>
											<div class="flex space-x-2">
												<button
													on:click={() => viewDocument(type)}
													class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
												>
													View
												</button>
												<button
													on:click={() => copyDocument(type)}
													class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
												>
													Copy URL
												</button>
												<button
													on:click={() => printDocument(type)}
													class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
												>
													Print
												</button>
											</div>
										</div>
									</div>
								{/if}
							{/each}

							{#if applicationLetters.length > 0}
								<div class="p-6">
									<div class="flex items-center justify-between">
										<div class="flex items-center space-x-3">
											<span class="text-2xl">📄</span>
											<div>
												<h4 class="font-medium text-gray-900">Application Letters</h4>
												{#if applicationLetters.length > 1}
													<div class="flex items-center space-x-2 mt-1">
														<select 
															bind:value={selectedVersions['application_letters']}
															class="text-xs border border-gray-300 rounded px-2 py-1"
														>
															{#each getDocumentVersions('application_letters') as version}
																<option value={version.document.id}>
																	{version.version} - {version.document.company_name || 'Unknown'} - {version.date}
																</option>
															{/each}
														</select>
														<span class="text-xs text-gray-500">
															{applicationLetters.length} letters
														</span>
													</div>
												{:else}
													<p class="text-sm text-gray-500">
														{applicationLetters[0]?.company_name || 'Unknown Company'} - {formatDate(applicationLetters[0]?.created_at)}
													</p>
												{/if}
											</div>
										</div>
										<div class="flex space-x-2">
											<button
												on:click={() => viewDocument('application_letters')}
												class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
											>
												View
											</button>
											<button
												on:click={() => copyDocument('application_letters')}
												class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
											>
												Copy URL
											</button>
											<button
												on:click={() => printDocument('application_letters')}
												class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md text-sm transition-colors"
											>
												Print
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>

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
												<p class="text-sm text-gray-600 mt-1">
													{formatActivityMetadata(activity.metadata)}
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