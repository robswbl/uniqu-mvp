<!-- src/routes/agency/[agencyId]/client/[userId]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';
	import { goto } from '$app/navigation';

	const { agencyId, userId } = $page.params;

	let client: any = null;
	let sessions: any[] = [];
	let activities: any[] = [];
	let documents: any[] = [];
	let applicationLetters: any[] = [];
	let clientSummary: any = null;
	let loading = true;
	let error = '';
	let selectedVersions: Record<string, string> = {};
	let realtimeSubscription: any = null;

	// Main document types to show
	const mainDocumentTypes = [
		'reflection_letter',
		'career_themes',
		'ideal_companies',
		'matching_companies'
	];

	// Group documents by type and get latest version for each
	function getDocumentsByType() {
		const grouped: Record<string, any[]> = {};

		// Group generated documents
		documents.forEach((doc) => {
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
		return docs.sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		)[0];
	}

	function getDocumentVersions(type: string) {
		const docs = getDocumentsByType()[type];
		if (!docs) return [];

		return docs
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.map((doc, index) => ({
				id: doc.id,
				version: `v${index + 1}`,
				date:
					new Date(doc.created_at).toLocaleDateString() +
					' ' +
					new Date(doc.created_at).toLocaleTimeString(),
				document: doc
			}));
	}

	function getSelectedDocument(type: string) {
		const versions = getDocumentVersions(type);
		const selectedId = selectedVersions[type];

		if (selectedId) {
			return versions.find((v) => v.document.id === selectedId)?.document;
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
			window.open(
				`/results/${sessions[0]?.id}/application_letter?company=${letter.company_name}`,
				'_blank'
			);
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

		navigator.clipboard
			.writeText(url)
			.then(() => {
				alert('Document URL copied to clipboard!');
			})
			.catch(() => {
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

		// Open in new window and trigger print after load
		const printWindow = window.open(url, '_blank');
		if (printWindow) {
			// Wait for the page to load, then print
			setTimeout(() => {
				printWindow.print();
			}, 1000);
		}
	}

	function getApplicationStatusColor(status: string): string {
		const statusColors: Record<string, string> = {
			draft: 'bg-gray-100 text-gray-700',
			sent: 'bg-blue-100 text-blue-700',
			responded: 'bg-yellow-100 text-yellow-700',
			interview: 'bg-green-100 text-green-700',
			rejected: 'bg-red-100 text-red-700',
			accepted: 'bg-purple-100 text-purple-700'
		};
		return statusColors[status] || 'bg-gray-100 text-gray-700';
	}

	function getApplicationStatusLabel(status: string): string {
		const statusLabels: Record<string, string> = {
			draft: 'Draft',
			sent: 'Sent',
			responded: 'Response Received',
			interview: 'Interview Scheduled',
			rejected: 'Rejected',
			accepted: 'Offer Received'
		};
		return statusLabels[status] || status;
	}

	function getApplicationFunnelData() {
		if (!applicationLetters || applicationLetters.length === 0) {
			return {
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
			};
		}

		const total = applicationLetters.length;
		const sent = applicationLetters.filter(letter => letter.status === 'sent').length;
		const responded = applicationLetters.filter(letter => letter.status === 'responded').length;
		const interview = applicationLetters.filter(letter => letter.status === 'interview').length;
		const rejected = applicationLetters.filter(letter => letter.status === 'rejected').length;
		const accepted = applicationLetters.filter(letter => letter.status === 'accepted').length;

		// Calculate percentages
		const sentPercentage = total > 0 ? Math.round((sent / total) * 100) : 0;
		const respondedPercentage = total > 0 ? Math.round((responded / total) * 100) : 0;
		const interviewPercentage = total > 0 ? Math.round((interview / total) * 100) : 0;
		const rejectedPercentage = total > 0 ? Math.round((rejected / total) * 100) : 0;
		const acceptedPercentage = total > 0 ? Math.round((accepted / total) * 100) : 0;

		// Calculate conversion rates
		const conversionRate = sent > 0 ? Math.round((interview / sent) * 100) : 0;
		const successRate = interview > 0 ? Math.round((accepted / interview) * 100) : 0;

		return {
			created: total,
			sent,
			responded,
			interview,
			rejected,
			accepted,
			sentPercentage,
			respondedPercentage,
			interviewPercentage,
			rejectedPercentage,
			acceptedPercentage,
			conversionRate,
			successRate
		};
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

			// Load client summary for this client
			const { data: summaryData, error: summaryError } = await supabase
				.from('client_summaries')
				.select('*')
				.eq('agency_id', agencyId)
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(1);

			if (!summaryError && summaryData && summaryData.length > 0) {
				clientSummary = summaryData[0];
			}
		} catch (err: any) {
			error = err.message;
			console.error('Error loading client data:', err);
		} finally {
			loading = false;
		}
	}

	// Cleanup on component destroy
	onDestroy(() => {
		cleanupRealtimeSubscription();
	});

	// Setup realtime subscription for client summary updates
	function setupRealtimeSubscription() {
		// Clean up existing subscription
		if (realtimeSubscription) {
			supabase.removeChannel(realtimeSubscription);
		}

		// Subscribe to changes on client_summaries table
		realtimeSubscription = supabase
			.channel('client_summaries')
			.on('postgres_changes', 
				{ 
					event: 'UPDATE', 
					schema: 'uniqu', 
					table: 'client_summaries',
					filter: `agency_id=eq.${agencyId} AND user_id=eq.${userId}`
				},
				(payload) => {
					console.log('Client summary updated:', payload);
					// Update the local clientSummary state
					if (payload.new) {
						clientSummary = payload.new;
					}
				}
			)
			.on('postgres_changes',
				{
					event: 'INSERT',
					schema: 'uniqu',
					table: 'client_summaries',
					filter: `agency_id=eq.${agencyId} AND user_id=eq.${userId}`
				},
				(payload) => {
					console.log('New client summary created:', payload);
					if (payload.new) {
						clientSummary = payload.new;
					}
				}
			)
			.subscribe((status) => {
				console.log('Realtime subscription status:', status);
			});
	}

	async function generateClientSummary(sessionId: string) {
		try {
			// Create initial summary record
			const { data: summaryData, error: insertError } = await supabase
				.from('client_summaries')
				.insert({
					agency_id: agencyId,
					user_id: userId,
					session_id: sessionId,
					summary_content: 'Generating...',
					status: 'generating'
				})
				.select()
				.single();

			if (insertError) throw insertError;

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
						agency_id: agencyId,
						summary_id: summaryData.id
					})
				}
			);

			if (response.ok) {
				// Log the activity
				await supabase.from('agency_activities').insert({
					agency_id: agencyId,
					user_id: userId,
					activity_type: 'summary_generated',
					session_id: sessionId,
					metadata: { action: 'summary_generated', summary_id: summaryData.id }
				});

				alert($t('agency.client.summary_generated'));
				// Reload data to show the new summary
				await loadClientData();
			} else {
				throw new Error('Failed to generate summary');
			}
		} catch (err: any) {
			alert('Error generating summary: ' + err.message);
		}
	}

	async function regenerateClientSummary() {
		if (clientSummary?.session_id) {
			await generateClientSummary(clientSummary.session_id);
		}
	}

	function viewClientSummary() {
		if (clientSummary?.summary_html) {
			// Open summary in new window/tab
			const newWindow = window.open('', '_blank');
			if (newWindow) {
				newWindow.document.write(`
					<!DOCTYPE html>
					<html>
					<head>
						<title>Client Summary - ${client?.user_firstname} ${client?.user_lastname}</title>
						<style>
							body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
							h1 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
							.summary-content { max-width: 800px; margin: 0 auto; }
						</style>
					</head>
					<body>
						<div class="summary-content">
							<h1>Client Summary</h1>
							${clientSummary.summary_html}
						</div>
					</body>
					</html>
				`);
				newWindow.document.close();
			}
		} else if (clientSummary?.summary_content) {
			// Show plain text content
			alert('Summary Content:\n\n' + clientSummary.summary_content);
		}
	}

		async function downloadClientSummary() {
		if (clientSummary?.pdf_url) {
			try {
				const response = await fetch(clientSummary.pdf_url);
				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `client_summary_${client?.user_firstname}_${client?.user_lastname}.pdf`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			} catch (err: any) {
				alert('Error downloading PDF: ' + err.message);
			}
		}
	}

	// Cleanup realtime subscription
	function cleanupRealtimeSubscription() {
		if (realtimeSubscription) {
			supabase.removeChannel(realtimeSubscription);
			realtimeSubscription = null;
		}
	}

	function formatDate(dateString: string) {
		return (
			new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString()
		);
	}

	function getStatusBadge(status: string) {
		const statusConfig: Record<string, { class: string; text: string }> = {
			completed: { class: 'bg-green-100 text-green-800', text: 'Completed' },
			'in-progress': { class: 'bg-yellow-100 text-yellow-800', text: 'In Progress' },
			not_started: { class: 'bg-gray-100 text-gray-800', text: 'Not Started' }
		};
		const config = statusConfig[status] || { class: 'bg-gray-100 text-gray-800', text: status };
		return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}">${config.text}</span>`;
	}

	function getActivityIcon(activityType: string) {
		const icons: Record<string, string> = {
			user_registered: '👤',
			questionnaire_started: '📝',
			questionnaire_completed: '✅',
			results_generated: '📊',
			application_letter_created: '📄',
			profile_updated: '🔄',
			login: '🔑'
		};
		return icons[activityType] || '📋';
	}

	function getDocumentIcon(documentType: string): string {
		const icons: Record<string, string> = {
			reflection_letter: '📝',
			career_themes: '🎯',
			ideal_companies: '🏢',
			matching_companies: '🔍',
			application_letter: '📄'
		};
		return icons[documentType] || '📋';
	}

	function getDocumentTitle(documentType: string): string {
		const titles: Record<string, string> = {
			reflection_letter: 'Reflection Letter',
			career_themes: 'Career Themes',
			ideal_companies: 'Ideal Companies',
			matching_companies: 'Matching Companies',
			application_letter: 'Application Letter'
		};
		return (
			titles[documentType] ||
			documentType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
		);
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
	<div class="mx-auto max-w-7xl px-4 py-8">
		<!-- Back Button -->
		<button
			on:click={() => goto('/agency/dashboard')}
			class="mb-6 inline-flex items-center text-gray-600 transition-colors duration-200 hover:text-gray-800"
			type="button"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			Back to Agency Dashboard
		</button>

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
			<!-- Client Header -->
			<div class="mb-8 rounded-lg bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<div class="h-16 w-16 flex-shrink-0">
							<div
								class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-semibold text-white"
							>
								{client?.user_firstname?.charAt(0) || 'U'}
							</div>
						</div>
						<div class="ml-6">
							<h1 class="text-3xl font-bold text-gray-900">
								{client?.user_firstname}
								{client?.user_lastname}
							</h1>
							<p class="mt-1 text-gray-600">{client?.user_email}</p>
							{#if client?.user_phone}
								<p class="mt-1 text-sm text-gray-500">📞 {client.user_phone}</p>
							{/if}
						</div>
					</div>
					<div class="text-right">
						<div class="text-2xl font-bold text-indigo-600">{getDocumentCount()}</div>
						<div class="text-sm text-gray-500">Documents</div>
					</div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<!-- Documents Section -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="border-b border-gray-200 px-6 py-4">
						<h2 class="text-xl font-semibold text-gray-900">Generated Documents</h2>
						<p class="mt-1 text-gray-600">All career analysis documents and application letters</p>
					</div>

					{#if documents.length === 0 && applicationLetters.length === 0}
						<div class="p-8 text-center">
							<div class="mb-4 text-4xl text-gray-400">📄</div>
							<h3 class="mb-2 text-lg font-medium text-gray-900">No documents yet</h3>
							<p class="text-gray-600">Documents will appear here once generated.</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each mainDocumentTypes as type}
								{#if getLatestDocument(type)}
									<div class="p-6">
										<div class="space-y-3">
											<div class="flex items-center justify-between">
												<div class="flex items-center space-x-3">
													<span class="text-2xl">{getDocumentIcon(type)}</span>
													<div>
														<h4 class="font-medium text-gray-900">{getDocumentTitle(type)}</h4>
														{#if getDocumentVersions(type).length > 1}
															<div class="mt-1 flex items-center space-x-2">
																<select
																	bind:value={selectedVersions[type]}
																	class="rounded border border-gray-300 px-2 py-1 text-xs"
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
											</div>
											<div class="flex space-x-2">
												<button
													on:click={() => viewDocument(type)}
													class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
												>
													View
												</button>
												<button
													on:click={() => copyDocument(type)}
													class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
												>
													Copy URL
												</button>
												<button
													on:click={() => printDocument(type)}
													class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
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
									<div class="space-y-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center space-x-3">
												<span class="text-2xl">📄</span>
												<div>
													<h4 class="font-medium text-gray-900">Application Letters</h4>
													{#if applicationLetters.length > 1}
														<div class="mt-1 flex items-center space-x-2">
															<select
																bind:value={selectedVersions['application_letters']}
																class="rounded border border-gray-300 px-2 py-1 text-xs"
															>
																{#each getDocumentVersions('application_letters') as version}
																	<option value={version.document.id}>
																		{version.version} - {version.document.company_name || 'Unknown'}
																		- {version.date}
																	</option>
																{/each}
															</select>
															<span class="text-xs text-gray-500">
																{applicationLetters.length} letters
															</span>
															<!-- Status badge for selected letter -->
															{#if selectedVersions['application_letters']}
																{@const selectedLetter = applicationLetters.find(
																	(l) => l.id === selectedVersions['application_letters']
																)}
																{#if selectedLetter}
																	<span
																		class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getApplicationStatusColor(
																			selectedLetter.status
																		)}"
																	>
																		{getApplicationStatusLabel(selectedLetter.status)}
																	</span>
																{/if}
															{:else}
																<!-- Status badge for latest letter -->
																{@const latestLetter = applicationLetters[0]}
																{#if latestLetter}
																	<span
																		class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getApplicationStatusColor(
																			latestLetter.status
																		)}"
																	>
																		{getApplicationStatusLabel(latestLetter.status)}
																	</span>
																{/if}
															{/if}
														</div>
													{:else}
														<div class="mt-1 flex items-center space-x-2">
															<p class="text-sm text-gray-500">
																{applicationLetters[0]?.company_name || 'Unknown Company'} - {formatDate(
																	applicationLetters[0]?.created_at
																)}
															</p>
															<span
																class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getApplicationStatusColor(
																	applicationLetters[0]?.status
																)}"
															>
																{getApplicationStatusLabel(applicationLetters[0]?.status)}
															</span>
														</div>
													{/if}
												</div>
											</div>
										</div>
										<div class="flex space-x-2">
											<button
												on:click={() => viewDocument('application_letters')}
												class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
											>
												View
											</button>
											<button
												on:click={() => copyDocument('application_letters')}
												class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
											>
												Copy URL
											</button>
											<button
												on:click={() => printDocument('application_letters')}
												class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
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

				<!-- Application Funnel Section -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="border-b border-gray-200 px-6 py-4">
						<h2 class="text-xl font-semibold text-gray-900">Application Funnel</h2>
						<p class="mt-1 text-gray-600">Track application letter progression and outcomes</p>
					</div>

					<div class="p-6">
						{#if applicationLetters.length > 0}
							{@const funnelData = getApplicationFunnelData()}
							<div class="space-y-6">
								<!-- Funnel Visualization -->
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
											<div class="text-2xl font-bold text-blue-600">{funnelData.created}</div>
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
											<div class="text-2xl font-bold text-indigo-600">{funnelData.sent}</div>
											<div class="text-xs text-indigo-500">{funnelData.sentPercentage}%</div>
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
											<div class="text-2xl font-bold text-yellow-600">{funnelData.responded}</div>
											<div class="text-xs text-yellow-500">{funnelData.respondedPercentage}%</div>
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
											<div class="text-2xl font-bold text-green-600">{funnelData.interview}</div>
											<div class="text-xs text-green-500">{funnelData.interviewPercentage}%</div>
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
											<div class="mb-2 text-2xl font-bold text-red-600">{funnelData.rejected}</div>
											<div class="text-sm font-medium text-red-900">Rejections</div>
											<div class="text-xs text-red-500">{funnelData.rejectedPercentage}%</div>
										</div>

										<!-- Offers -->
										<div class="flex-1 rounded-lg bg-purple-50 p-4 text-center">
											<div class="mb-2 text-2xl font-bold text-purple-600">{funnelData.accepted}</div>
											<div class="text-sm font-medium text-purple-900">Offers</div>
											<div class="text-xs text-purple-500">{funnelData.acceptedPercentage}%</div>
										</div>
									</div>
								</div>

								<!-- Summary Stats -->
								<div class="mt-6 rounded-lg bg-gray-50 p-4">
									<div class="grid grid-cols-2 gap-4 text-center">
										<div>
											<div class="text-lg font-semibold text-gray-900">{funnelData.conversionRate}%</div>
											<div class="text-sm text-gray-600">Conversion Rate</div>
											<div class="text-xs text-gray-500">Sent to Interview</div>
										</div>
										<div>
											<div class="text-lg font-semibold text-gray-900">{funnelData.successRate}%</div>
											<div class="text-sm text-gray-600">Success Rate</div>
											<div class="text-xs text-gray-500">Interview to Offer</div>
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="text-center">
								<div class="mb-4 text-4xl text-gray-400">📊</div>
								<h3 class="mb-2 text-lg font-medium text-gray-900">No Application Letters Yet</h3>
								<p class="text-gray-600">Application funnel will appear here once letters are created.</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Client Summary Section -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="border-b border-gray-200 px-6 py-4">
						<h2 class="text-xl font-semibold text-gray-900">{$t('agency.client.summary.title')}</h2>
						<p class="mt-1 text-gray-600">{$t('agency.client.summary.description')}</p>
					</div>

					<div class="p-6">
						{#if clientSummary}
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center space-x-3">
										<span class="text-2xl">📋</span>
										<div>
											<h4 class="font-medium text-gray-900">{$t('agency.client.summary.title')}</h4>
											<p class="text-sm text-gray-500">
												{$t('agency.client.summary.generated')}: {formatDate(clientSummary.created_at)}
												{#if clientSummary.generated_at}
													<br>{$t('agency.client.summary.completed_at')}: {formatDate(clientSummary.generated_at)}
												{/if}
											</p>
										</div>
									</div>
									<div class="flex items-center space-x-2">
										{#if clientSummary.status === 'generating'}
											<span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
												<div class="mr-1.5 h-2 w-2 animate-spin rounded-full border border-yellow-600 border-t-transparent"></div>
												{$t('agency.client.summary.generating')}
											</span>
										{:else if clientSummary.status === 'completed'}
											<span class="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
												✅ {$t('agency.client.summary.completed')}
											</span>
										{:else if clientSummary.status === 'failed'}
											<span class="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
												❌ {$t('agency.client.summary.failed')}
											</span>
										{/if}
									</div>
								</div>

								{#if clientSummary.status === 'completed'}
									<div class="flex space-x-2">
										<button
											on:click={() => viewClientSummary()}
											class="rounded-md bg-indigo-50 px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-900"
										>
											{$t('agency.client.summary.view_summary')}
										</button>
										{#if clientSummary.pdf_url}
											<button
												on:click={() => downloadClientSummary()}
												class="rounded-md bg-green-50 px-3 py-1 text-sm text-green-600 transition-colors hover:bg-green-100 hover:text-green-900"
											>
												{$t('agency.client.summary.download_pdf')}
											</button>
										{/if}
										<button
											on:click={() => regenerateClientSummary()}
											class="rounded-md bg-orange-50 px-3 py-1 text-sm text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-900"
										>
											{$t('agency.client.summary.regenerate')}
										</button>
									</div>
								{:else if clientSummary.status === 'failed'}
									<div class="flex space-x-2">
										<button
											on:click={() => regenerateClientSummary()}
											class="rounded-md bg-red-50 px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-100 hover:text-red-900"
										>
											{$t('agency.client.summary.retry')}
										</button>
									</div>
								{/if}
							</div>
						{:else}
							<div class="space-y-4">
								<!-- Questionnaire Sessions when no summary exists -->
								<div class="border-t border-gray-200 pt-4">
									<h4 class="mb-3 text-lg font-medium text-gray-900">Questionnaire Sessions</h4>
									{#if sessions.length === 0}
										<div class="text-center">
											<div class="mb-4 text-4xl text-gray-400">📝</div>
											<h3 class="mb-2 text-lg font-medium text-gray-900">No sessions yet</h3>
											<p class="text-gray-600">Client hasn't started any questionnaires.</p>
										</div>
									{:else}
										<div class="space-y-3">
											{#each sessions as session}
												<div class="flex items-center justify-between rounded-lg border border-gray-200 p-3">
													<div>
														<div class="flex items-center space-x-2">
															<span
																class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {session.status ===
																'completed'
																	? 'bg-green-100 text-green-800'
																	: session.status === 'in-progress'
																		? 'bg-yellow-100 text-yellow-800'
																		: 'bg-gray-100 text-gray-800'}"
															>
																{session.status}
															</span>
															<span class="text-sm text-gray-500">
																{formatDate(session.created_at)}
															</span>
														</div>
														<p class="mt-1 text-sm text-gray-600">
															Session ID: {session.id}
														</p>
													</div>
													{#if session.status === 'completed'}
														<button
															on:click={() => generateClientSummary(session.id)}
															class="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
														>
															Generate Summary
														</button>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Generate Summary Button -->
								<div class="text-center">
									<div class="mb-4 text-4xl text-gray-400">📋</div>
									<h3 class="mb-2 text-lg font-medium text-gray-900">{$t('agency.client.summary.no_summary')}</h3>
									<p class="mb-4 text-gray-600">
										{$t('agency.client.summary.no_summary_desc')}
									</p>
									<button
										on:click={() => generateClientSummary(sessions[0]?.id)}
										disabled={!sessions[0]?.id || sessions[0]?.status !== 'completed'}
										class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
									>
										{$t('agency.client.summary.generate_button')}
									</button>
									{#if !sessions[0]?.id || sessions[0]?.status !== 'completed'}
										<p class="mt-2 text-xs text-gray-500">
											{$t('agency.client.summary.complete_first')}
										</p>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>



				<!-- Activities Section -->
				<div class="rounded-lg bg-white shadow-sm">
					<div class="border-b border-gray-200 px-6 py-4">
						<h2 class="text-xl font-semibold text-gray-900">Agency Activities</h2>
						<p class="mt-1 text-gray-600">Track all interactions with this client</p>
					</div>

					{#if activities.length === 0}
						<div class="p-8 text-center">
							<div class="mb-4 text-4xl text-gray-400">📊</div>
							<h3 class="mb-2 text-lg font-medium text-gray-900">No activities yet</h3>
							<p class="text-gray-600">
								Activities will appear here as you interact with this client.
							</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-200">
							{#each activities as activity}
								<div class="p-6">
									<div class="flex items-start space-x-3">
										<div class="flex-shrink-0 text-2xl">
											{getActivityIcon(activity.activity_type)}
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm font-medium text-gray-900">
												{activity.activity_type
													.replace('_', ' ')
													.replace(/\b\w/g, (l: string) => l.toUpperCase())}
											</p>
											<p class="text-sm text-gray-500">
												{formatDate(activity.created_at)}
											</p>
											{#if activity.metadata}
												<p class="mt-1 text-sm text-gray-600">
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
