<!-- /results/[sessionId]/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';

	let sessionId = $page.params.sessionId;
	
	/** @type {Array<{id: string, session_id: string, document_type: string, content_html: string, created_at: string}>} */
	let documents = [];
	
	/** @type {Array<{id: number, session_id: string, company_name: string, company_id: string|null, letter_content_html: string|null, status: string, generated_at: string|null, sent_at: string|null, response_received_at: string|null, notes: string|null, created_at: string, updated_at: string}>} */
	let motivationalLetters = [];
	
	let loading = true;
	
	/** @type {string|null} */
	let error = null;

	/**
	 * Get unique documents (existing deduplication logic)
	 * @param {Array<{id: string, session_id: string, document_type: string, content_html: string, created_at: string}>} docs
	 * @returns {Array<{id: string, session_id: string, document_type: string, content_html: string, created_at: string}>}
	 */
	function getUniqueDocuments(docs) {
		const seen = new Set();
		return docs.filter(doc => {
			if (seen.has(doc.document_type)) {
				return false;
			}
			seen.add(doc.document_type);
			return true;
		});
	}

	/**
	 * Fetch documents and motivational letters
	 * @returns {Promise<void>}
	 */
	async function fetchData() {
		try {
			loading = true;

			// Fetch generated documents (existing logic)
			const { data: docsData, error: docsError } = await supabase
				.from('generated_documents')
				.select('*')
				.eq('session_id', sessionId)
				.neq('document_type', 'motivational_letter')  // ADD THIS LINE
				.order('created_at', { ascending: false });

			if (docsError) throw docsError;

			// Fetch motivational letters (new)
			const { data: lettersData, error: lettersError } = await supabase
				.from('motivational_letters')
				.select('*')
				.eq('session_id', sessionId)
				.order('created_at', { ascending: false });

			if (lettersError) throw lettersError;

			documents = getUniqueDocuments(docsData || []);
			motivationalLetters = lettersData || [];
			
		} catch (err) {
			error = (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') 
				? err.message 
				: 'An unknown error occurred';
			console.error('Error fetching data:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Navigate to specific document
	 * @param {string} documentType
	 * @returns {void}
	 */
	function viewDocument(documentType) {
		console.log('Navigating to document:', documentType);
		goto(`/results/${sessionId}/${documentType}`);
	}

	/**
	 * Navigate to letters page
	 * @returns {void}
	 */
	function viewLetters() {
		console.log('Navigating to letters page');
		goto(`/results/${sessionId}/letters`);
	}

	onMount(() => {
		fetchData();
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="mb-8">
			<button 
				on:click={() => goto(`/dashboard/${sessionId}`)}
				class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
				type="button"
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
					on:click={fetchData}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					type="button"
				>
					Try Again
				</button>
			</div>
		{:else}
			<!-- Results Grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
				
				<!-- Existing Document Cards -->
				{#each documents as document}
					<button 
						class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 w-full text-left p-6 group"
						on:click={() => viewDocument(document.document_type)}
						type="button"
					>
						<div class="h-full flex flex-col">
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1">
									<h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
										{#if document.document_type === 'motivational_letter'}
											📄 Motivational Letter
										{:else if document.document_type === 'career_themes'}
											🎯 Career Themes
										{:else if document.document_type === 'matching_companies'}
											🏢 Matching Companies
										{:else}
											📋 {document.document_type.replace('_', ' ').toUpperCase()}
										{/if}
									</h3>
									<p class="text-gray-600 text-sm">
										Generated {new Date(document.created_at).toLocaleDateString()}
									</p>
								</div>
								<div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
									Ready
								</div>
							</div>
							
							<div class="flex-1">
								<p class="text-gray-600 text-sm mb-4">
									{#if document.document_type === 'motivational_letter'}
										Your personalized reflection and motivation letter based on your career assessment.
									{:else if document.document_type === 'career_themes'}
										Key themes and insights about your ideal career path and working style.
									{:else if document.document_type === 'matching_companies'}
										Companies that align with your values, interests, and career goals.
									{:else}
										View this generated document based on your career assessment.
									{/if}
								</p>
							</div>
							
							<div class="flex items-center justify-between pt-4 border-t border-gray-100">
								<span class="text-indigo-600 font-medium text-sm group-hover:text-indigo-800 transition-colors">
									View Document →
								</span>
								<svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</div>
						</div>
					</button>
				{/each}

				<!-- NEW: Motivational Letters Card -->
				<button 
					class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 w-full text-left p-6 group"
					on:click={viewLetters}
					type="button"
				>
					<div class="h-full flex flex-col">
						<div class="flex items-start justify-between mb-4">
							<div class="flex-1">
								<h3 class="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
									✉️ Application Letters
								</h3>
								<p class="text-gray-600 text-sm">
									{#if motivationalLetters.length > 0}
										{motivationalLetters.length} letter{motivationalLetters.length === 1 ? '' : 's'} generated
									{:else}
										No letters generated yet
									{/if}
								</p>
							</div>
							<div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-medium">
								{#if motivationalLetters.length > 0}
									{motivationalLetters.length}
								{:else}
									New
								{/if}
							</div>
						</div>
						
						<div class="flex-1">
							<p class="text-gray-600 text-sm mb-4">
								{#if motivationalLetters.length > 0}
									Personalized motivational letters for companies that match your profile. Track application status and responses.
								{:else}
									Generate personalized motivational letters for companies that match your profile.
								{/if}
							</p>

							{#if motivationalLetters.length > 0}
								<div class="space-y-2 mb-4">
									{#each motivationalLetters.slice(0, 2) as letter}
										<div class="flex items-center justify-between text-xs">
											<span class="text-gray-700 truncate mr-2">{letter.company_name}</span>
											<span class="px-2 py-1 rounded-full text-xs font-medium
												{letter.status === 'draft' ? 'bg-gray-100 text-gray-700' : 
												 letter.status === 'sent' ? 'bg-blue-100 text-blue-700' :
												 letter.status === 'interview' ? 'bg-green-100 text-green-700' :
												 'bg-yellow-100 text-yellow-700'}">
												{letter.status}
											</span>
										</div>
									{/each}
									{#if motivationalLetters.length > 2}
										<p class="text-xs text-gray-500">+{motivationalLetters.length - 2} more...</p>
									{/if}
								</div>
							{/if}
						</div>
						
						<div class="flex items-center justify-between pt-4 border-t border-gray-100">
							<span class="text-indigo-600 font-medium text-sm group-hover:text-indigo-800 transition-colors">
								{motivationalLetters.length > 0 ? 'Manage Letters' : 'Generate Letters'} →
							</span>
							<svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</div>
				</button>

			</div>

			<!-- Quick Actions (if no documents exist) -->
			{#if documents.length === 0 && motivationalLetters.length === 0}
				<div class="text-center py-12">
					<div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
						<h3 class="text-xl font-semibold text-gray-900 mb-4">No Results Yet</h3>
						<p class="text-gray-600 mb-6">Complete your questionnaire to generate your career analysis results.</p>
						<button 
							on:click={() => goto(`/questionnaire/${sessionId}`)}
							class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium"
							type="button"
						>
							Complete Questionnaire
						</button>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>