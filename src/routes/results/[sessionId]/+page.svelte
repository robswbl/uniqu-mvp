<!-- src/routes/results/[sessionId]/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';

	let sessionId = $page.params.sessionId;
	let documents = [];
	let loading = true;
	let error = null;
	let refreshInterval = null;
	let regenerationTimestamp = null;

	// Define the correct document order and metadata
	const documentOrder = [
		{
			type: 'reflection_letter',
			title: 'REFLECTION LETTER',
			description: 'Your personalized reflection and motivation letter based on your career assessment.',
			icon: '📝',
			color: 'from-purple-500 to-pink-500'
		},
		{
			type: 'career_themes',
			title: 'Career Themes',
			description: 'Key themes and insights about your ideal career path and working style.',
			icon: '🎯',
			color: 'from-blue-500 to-indigo-500'
		},
		{
			type: 'ideal_companies',
			title: 'IDEAL COMPANIES',
			description: 'View this generated document based on your career assessment.',
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

			// Fetch documents excluding motivational letters
			const { data: documentsData, error: documentsError } = await supabase
				.from('generated_documents')
				.select('*')
				.eq('session_id', sessionId)
				.neq('document_type', 'motivational_letter')
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
				status: 'Ready',
				statusColor: 'text-green-600',
				document: doc
			};
		} else {
			return {
				ready: false,
				status: 'Generating...',
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

	onMount(() => {
		fetchDocuments();
		
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
	<title>Your Career Analysis Results - UniqU</title>
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
				Back to Dashboard
			</button>
			
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Your Career Analysis Results</h1>
			<p class="text-gray-600">View and download your personalized career guidance documents</p>
		</div>

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
				<h3 class="text-lg font-semibold text-red-800 mb-2">Error Loading Results</h3>
				<p class="text-red-600">{error}</p>
				<button 
					on:click={fetchDocuments}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					type="button"
					aria-label="Try Again"
				>
					Try Again
				</button>
			</div>
		{:else}
			
			<!-- Generation Status Banner (if still generating) -->
			{#if !allMainDocumentsReady()}
				<div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
					<div class="flex items-center space-x-3">
						<div class="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
						<div>
							<h3 class="text-blue-900 font-medium">Analysis in Progress</h3>
							<p class="text-blue-800 text-sm">Some documents are still being generated. This page will auto-refresh.</p>
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
									<span class="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-full">
										Ready
									</span>
								{:else}
									<div class="flex items-center space-x-2">
										<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
										<span class="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-full">
											Generating...
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
									Generated {new Date(docStatus.document.created_at).toLocaleString()}
								</p>
								
								<button 
									on:click={() => viewDocument(docStatus.document)}
									class="flex items-center space-x-2 w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
									type="button"
									aria-label="View {docInfo.title}"
								>
									<span>View Document</span>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							{:else}
								<p class="text-gray-600 text-sm mb-4">{docInfo.description}</p>
								<div class="bg-blue-50 rounded-lg p-4">
									<div class="flex items-center space-x-2 mb-2">
										<div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
										<span class="text-blue-800 text-sm font-medium">AI is generating this document...</span>
									</div>
									<p class="text-blue-700 text-xs">This typically takes 30-60 seconds to complete.</p>
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
								<h3 class="text-xl font-semibold text-gray-900">Application Letters</h3>
								<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">New</span>
							</div>
						</div>
						
						<button 
							on:click={() => goto(`/results/${sessionId}/letters`)}
							class="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
							type="button"
							aria-label="Generate Application Letters"
						>
							<span>Generate Letters</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>
					
					<p class="text-gray-600 text-sm mb-4">
						Generate personalized motivational letters for companies that match your profile.
					</p>
					
					<div class="bg-indigo-50 rounded-lg p-4">
						<h4 class="text-indigo-900 font-medium text-sm mb-2">✨ What you can do:</h4>
						<ul class="text-indigo-800 text-sm space-y-1">
							<li>• Create custom letters for specific companies</li>
							<li>• Track application status and follow-ups</li>
							<li>• Use AI to tailor letters to company needs</li>
						</ul>
					</div>
				</div>
			{:else}
				<!-- Placeholder for Application Letters -->
				<div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-8">
					<div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
						<span class="text-2xl opacity-50">💌</span>
					</div>
					<h3 class="text-lg font-semibold text-gray-500 mb-2">Application Letters</h3>
					<p class="text-gray-400 text-sm">
						Available after your career analysis documents are complete
					</p>
					<div class="mt-4">
						<div class="inline-flex items-center space-x-2 text-gray-400 text-xs">
							<div class="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
							<span>Waiting for main documents...</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Additional Actions -->
			<div class="bg-gray-50 rounded-xl p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Additional Actions</h3>
				<div class="flex flex-wrap gap-4">
					<button 
						on:click={() => goto(`/questionnaire/${sessionId}`)}
						class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors text-sm"
						type="button"
						aria-label="Update Responses and Regenerate"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span>Update responses and regenerate</span>
					</button>
					
					<button 
						on:click={fetchDocuments}
						class="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
						type="button"
						aria-label="Refresh Documents"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span>Refresh</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>