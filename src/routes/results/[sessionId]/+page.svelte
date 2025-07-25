<!-- src/routes/results/[sessionId]/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';
	import { t } from 'svelte-i18n';

	let sessionId = $page.params.sessionId;
	let documents = [];
	let loading = true;
	let error = null;
	let refreshInterval = null;
	let regenerationTimestamp = null;
	let userFirstName = '';

	// Define the correct document order and metadata
	const documentOrder = [
		{
			type: 'reflection_letter',
			title: $t('results.reflection_letter_title'),
			description: $t('results.reflection_letter_desc'),
			icon: '📝',
			color: 'from-purple-500 to-pink-500'
		},
		{
			type: 'career_themes',
			title: $t('results.career_themes_title'),
			description: $t('results.career_themes_desc'),
			icon: '🎯',
			color: 'from-blue-500 to-indigo-500'
		},
		{
			type: 'ideal_companies',
			title: $t('results.ideal_companies_title'),
			description: $t('results.ideal_companies_desc'),
			icon: '🏢',
			color: 'from-green-500 to-emerald-500'
		}
	];

	async function fetchDocuments() {
		try {
			loading = true;

			// Get regeneration timestamp first
			const { data: sessionData } = await supabase
				.from('questionnaire_sessions')
				.select('last_regeneration, completed_at')
				.eq('id', sessionId)
				.single();

			if (sessionData) {
				regenerationTimestamp = sessionData.last_regeneration || sessionData.completed_at;
			}

			// Fetch documents excluding application letters
			const { data: documentsData, error: documentsError } = await supabase
				.from('generated_documents')
				.select('*')
				.eq('session_id', sessionId)
				.neq('document_type', 'application_letter')
				.order('created_at', { ascending: false });

			if (documentsError) throw documentsError;

			// If we have a regeneration timestamp, prioritize fresh documents
			if (regenerationTimestamp) {
				const freshDocs = (documentsData || []).filter(doc => doc.created_at >= regenerationTimestamp);
				const oldDocs = (documentsData || []).filter(doc => doc.created_at < regenerationTimestamp);
				
				// Show fresh docs first, fall back to old docs if fresh ones don't exist yet
				const docsToShow = [];
				documentOrder.forEach(docInfo => {
					const freshDoc = freshDocs.find(d => d.document_type === docInfo.type);
					const oldDoc = oldDocs.find(d => d.document_type === docInfo.type);
					
					if (freshDoc) {
						docsToShow.push(freshDoc);
					} else if (oldDoc) {
						docsToShow.push(oldDoc); // Fallback to old doc if fresh one doesn't exist yet
					}
				});
				
				documents = docsToShow;
			} else {
				documents = documentsData || [];
			}

		} catch (err) {
			error = err?.message || 'Failed to load documents';
			console.error('Error fetching documents:', err);
		} finally {
			loading = false;
		}
	}

	async function fetchUserFirstName() {
		// Get user_id from session
		const { data: sessionData, error: sessionError } = await supabase
			.from('questionnaire_sessions')
			.select('user_id')
			.eq('id', sessionId)
			.single();
		if (sessionError || !sessionData) return;
		// Get first name from users table
		const { data: user, error: userError } = await supabase
			.from('users')
			.select('user_firstname')
			.eq('user_uuid', sessionData.user_id)
			.single();
		if (!userError && user && user.user_firstname) {
			userFirstName = user.user_firstname;
		}
	}

	// Get document by type
	function getDocument(type) {
		return documents.find(doc => doc.document_type === type);
	}

	// Check if all main documents are ready
	function allMainDocumentsReady() {
		return documentOrder.every(docInfo => getDocument(docInfo.type));
	}

	// Get document status for display
	function getDocumentStatus(type) {
		const doc = getDocument(type);
		if (doc) {
			return {
				ready: true,
				status: $t('results.status_ready'),
				statusColor: 'text-green-600',
				document: doc
			};
		} else {
			return {
				ready: false,
				status: $t('results.status_generating'),
				statusColor: 'text-blue-600',
				document: null
			};
		}
	}

	// View document function - navigate to proper document type pages
	function viewDocument(doc) {
		// Use the exact document_type from database (with underscores)
		goto(`/results/${sessionId}/${doc.document_type}`);
	}

	// Download all documents as a zip
	async function downloadAllDocuments() {
		try {
			const readyDocs = documents.filter(doc => doc.content_html);
			if (readyDocs.length === 0) {
				alert('No documents ready for download yet.');
				return;
			}

			// For now, just download the first document as a demo
			// In a full implementation, you'd create a zip file with all documents
			const doc = readyDocs[0];
			const blob = new Blob([doc.content_html], { type: 'text/html' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${doc.document_type.replace('_', '-')}.html`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Download failed:', error);
			alert('Download failed. Please try again.');
		}
	}

	// Share results functionality
	function shareResults() {
		if (navigator.share) {
			navigator.share({
				title: 'My UniqU Career Analysis',
				text: 'Check out my personalized career analysis from UniqU!',
				url: window.location.href
			}).catch(console.error);
		} else {
			// Fallback: copy URL to clipboard
			navigator.clipboard.writeText(window.location.href).then(() => {
				alert('Results URL copied to clipboard!');
			}).catch(() => {
				alert('Please copy this URL to share your results: ' + window.location.href);
			});
		}
	}

	// Show help and support
	function showHelp() {
		// For now, just show a simple help modal
		// In a full implementation, this would open a help modal or redirect to help page
		alert('Need help? Contact us at support@uniqu.com or visit our help center.');
	}

	onMount(() => {
		fetchDocuments();
		fetchUserFirstName();
		
		// Set up auto-refresh every 5 seconds if documents are still generating
		refreshInterval = setInterval(() => {
			if (!allMainDocumentsReady()) {
				fetchDocuments();
			} else {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		}, 5000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});
</script>

<svelte:head>
	<title>{$t('results.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="max-w-6xl mx-auto">
		
		<!-- Header -->
		<div class="mb-8">
			<button 
				on:click={() => goto(`/dashboard/${sessionId}`)}
				class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
				type="button"
				aria-label="Back to Dashboard"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				{$t('results.back_to_dashboard')}
			</button>
			
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				{userFirstName ? `${userFirstName}, ${$t('results.heading_with_name')}` : $t('results.heading')}
			</h1>
			<p class="text-gray-600">{$t('results.subheading')}</p>
		</div>

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
				<h3 class="text-lg font-semibold text-red-800 mb-2">{$t('results.error_loading')}</h3>
				<p class="text-red-600">{error}</p>
				<button 
					on:click={fetchDocuments}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					type="button"
					aria-label="Try Again"
				>
					{$t('results.try_again')}
				</button>
			</div>
		{:else}
			
			<!-- Generation Status Banner (if still generating) -->
			{#if !allMainDocumentsReady()}
				<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
					<div class="flex items-center space-x-3">
						<div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
						<div>
							<h3 class="text-blue-900 font-medium">{$t('results.analysis_in_progress')}</h3>
							<p class="text-blue-800 text-sm">{$t('results.analysis_in_progress_desc')}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Main Documents Grid (in correct order) -->
			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
				{#each documentOrder as docInfo}
					{@const docStatus = getDocumentStatus(docInfo.type)}
					<div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
						
						<!-- Header -->
						<div class="bg-gradient-to-r {docInfo.color} p-6">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-3">
									<span class="text-2xl">{docInfo.icon}</span>
									<h3 class="text-lg font-semibold text-white">{docInfo.title}</h3>
								</div>
								
								{#if docStatus.ready}
									<span class="bg-white bg-opacity-90 text-gray-800 text-xs px-3 py-1 rounded-full font-medium">
										{$t('results.status_ready')}
									</span>
								{:else}
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
										<span class="bg-white bg-opacity-90 text-gray-800 text-xs px-3 py-1 rounded-full font-medium">
											{$t('results.status_generating')}
										</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Content -->
						<div class="p-6">
							{#if docStatus.ready}
								<p class="text-gray-600 text-sm mb-4">{docInfo.description}</p>
								<p class="text-xs text-gray-500 mb-4">
									{$t('results.generated_at')} {new Date(docStatus.document.created_at).toLocaleString()}
								</p>
								
								<button 
									on:click={() => viewDocument(docStatus.document)}
									class="flex items-center space-x-2 w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
									type="button"
									aria-label="View {docInfo.title}"
								>
									<span>{$t('results.view_document')}</span>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							{:else}
								<p class="text-gray-600 text-sm mb-4">{docInfo.description}</p>
								<div class="bg-blue-50 rounded-lg p-4">
									<div class="flex items-center space-x-2 mb-2">
										<div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
										<span class="text-blue-800 text-sm font-medium">{$t('results.ai_generating')}</span>
									</div>
									<p class="text-blue-700 text-xs">{$t('results.ai_generating_time')}</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<!-- Application Letters Section (only show if all main documents are ready) -->
			{#if allMainDocumentsReady()}
				<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center space-x-3">
							<span class="text-2xl">💌</span>
							<div>
								<h3 class="text-xl font-semibold text-gray-900">{$t('results.application_letters_title')}</h3>
								<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">{$t('results.new')}</span>
							</div>
						</div>
						
						<button 
							on:click={() => goto(`/results/${sessionId}/letters`)}
							class="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
							type="button"
							aria-label="Manage and Generate Application Letters"
						>
							<span>{$t('results.manage_generate_letters')}</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
					
					<p class="text-gray-600 text-sm mb-4">
						{$t('results.application_letters_desc')}
					</p>
					
					<div class="bg-indigo-50 rounded-lg p-4">
						<h4 class="text-indigo-900 font-medium text-sm mb-2">{$t('results.what_you_can_do')}</h4>
						<ul class="text-indigo-800 text-sm space-y-1">
							<li>• {$t('results.create_custom_letters')}</li>
							<li>• {$t('results.track_status')}</li>
							<li>• {$t('results.use_ai')}</li>
						</ul>
					</div>
				</div>
			{:else}
				<!-- Placeholder for Application Letters -->
				<div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-8">
					<div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
						<span class="text-2xl opacity-50">💌</span>
					</div>
					<h3 class="text-lg font-semibold text-gray-500 mb-2">{$t('results.application_letters_title')}</h3>
					<p class="text-gray-400 text-sm">
						{$t('results.application_letters_available_after')}
					</p>
					<div class="mt-4">
						<div class="inline-flex items-center space-x-2 text-gray-400 text-xs">
							<div class="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
							<span>{$t('results.waiting_for_main_documents')}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Enhanced Additional Actions -->
			<div class="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
				<div class="flex items-center justify-between mb-6">
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900">{$t('results.additional_actions')}</h3>
					</div>
				</div>
				
				<div class="grid md:grid-cols-3 gap-4">
					<!-- Top Row: Dashboard, Update Profile, Refresh -->
					
					<!-- Dashboard -->
					<button 
						on:click={() => goto(`/dashboard/${sessionId}`)}
						class="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 border border-gray-200 rounded-lg transition-all duration-300 group"
						type="button"
						aria-label="View Dashboard"
					>
						<div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div class="text-left">
							<div class="font-medium text-gray-900">{$t('results.dashboard')}</div>
							<div class="text-xs text-gray-700">{$t('results.dashboard_desc')}</div>
						</div>
					</button>

					<!-- Update Profile -->
					<button 
						on:click={() => goto(`/questionnaire/${sessionId}`)}
						class="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border border-orange-200 rounded-lg transition-all duration-300 group"
						type="button"
						aria-label="Update Responses and Regenerate"
					>
						<div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</div>
						<div class="text-left">
							<div class="font-medium text-orange-900">{$t('results.update_profile')}</div>
							<div class="text-xs text-orange-700">{$t('results.update_profile_desc')}</div>
						</div>
					</button>

					<!-- Refresh Documents -->
					<button 
						on:click={fetchDocuments}
						class="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-lg transition-all duration-300 group"
						type="button"
						aria-label="Refresh Documents"
					>
						<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
						</div>
						<div class="text-left">
							<div class="font-medium text-blue-900">{$t('results.refresh')}</div>
							<div class="text-xs text-blue-700">{$t('results.refresh_desc')}</div>
						</div>
					</button>
				</div>

				<!-- Bottom Row: Coming Soon Features -->
				<div class="mt-4 pt-4 border-t border-gray-200">
					<h4 class="text-sm font-medium text-gray-500 mb-3">{$t('results.coming_soon')}</h4>
					<div class="grid md:grid-cols-3 gap-4">
						<!-- Download All (Coming Soon) -->
						<button 
							disabled
							class="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 rounded-lg opacity-60 cursor-not-allowed"
							type="button"
							aria-label="Download All Documents (Coming Soon)"
						>
							<div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
							<div class="text-left">
								<div class="font-medium text-gray-600">{$t('results.download_all')}</div>
								<div class="text-xs text-gray-500">{$t('results.download_all_desc')}</div>
								<div class="text-xs text-blue-600 font-medium mt-1">{$t('results.coming_soon_label')}</div>
							</div>
						</button>

						<!-- Share Results (Coming Soon) -->
						<button 
							disabled
							class="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 rounded-lg opacity-60 cursor-not-allowed"
							type="button"
							aria-label="Share Results (Coming Soon)"
						>
							<div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
								</svg>
							</div>
							<div class="text-left">
								<div class="font-medium text-gray-600">{$t('results.share_results')}</div>
								<div class="text-xs text-gray-500">{$t('results.share_results_desc')}</div>
								<div class="text-xs text-blue-600 font-medium mt-1">{$t('results.coming_soon_label')}</div>
							</div>
						</button>

						<!-- Help & Support (Coming Soon) -->
						<button 
							disabled
							class="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 rounded-lg opacity-60 cursor-not-allowed"
							type="button"
							aria-label="Help & Support (Coming Soon)"
						>
							<div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
								<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div class="text-left">
								<div class="font-medium text-gray-600">{$t('results.help')}</div>
								<div class="text-xs text-gray-500">{$t('results.help_desc')}</div>
								<div class="text-xs text-blue-600 font-medium mt-1">{$t('results.coming_soon_label')}</div>
							</div>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>