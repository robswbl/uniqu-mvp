<!-- src/routes/results/[sessionId]/generating/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';

	let sessionId = $page.params.sessionId;
	let timeElapsed = 0;
	let timer = null;
	let subscription = null;
	let regenerationTimestamp = null;
	let documentsFound = {
		reflection_letter: false,
		career_themes: false,
		ideal_companies: false
	};
	let totalDocuments = 0;

	// Get regeneration timestamp from session
	async function getRegenerationTimestamp() {
		try {
			const { data: sessionData, error } = await supabase
				.from('questionnaire_sessions')
				.select('last_regeneration, completed_at')
				.eq('id', sessionId)
				.single();

			if (sessionData) {
				// Use last_regeneration if available, otherwise completed_at
				regenerationTimestamp = sessionData.last_regeneration || sessionData.completed_at;
				console.log('Regeneration timestamp:', regenerationTimestamp);
			}
		} catch (err) {
			console.error('Error getting regeneration timestamp:', err);
		}
	}

	// Start timer
	function startTimer() {
		timer = setInterval(() => {
			timeElapsed++;
		}, 1000);
	}

	// Format time as MM:SS
	function formatTime(seconds) {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	// Check if we should redirect to results
	async function checkAndRedirect() {
		// Only redirect when ALL documents are complete
		if (totalDocuments >= 3) {
			console.log('All documents complete! Redirecting to ready page...');
			if (timer) clearInterval(timer);
			if (subscription) subscription.unsubscribe();
			// Redirect to the new bridge page
			await goto(`/results/${sessionId}/ready`);
		}
	}

	// Check existing documents (only those created after regeneration)
	async function checkExistingDocuments() {
		if (!regenerationTimestamp) {
			console.log('No regeneration timestamp, skipping existing documents check');
			return;
		}

		console.log('Checking existing documents for session:', sessionId);
		console.log('Looking for documents after:', regenerationTimestamp);

		try {
			const { data: existingDocs, error } = await supabase
				.from('generated_documents')
				.select('document_type, created_at')
				.eq('session_id', sessionId)
				.in('document_type', ['reflection_letter', 'career_themes', 'ideal_companies'])
				.gte('created_at', regenerationTimestamp); // Only get documents created AFTER regeneration

			if (error) {
				console.error('Error fetching existing documents:', error);
				return;
			}

			console.log('Found existing documents:', existingDocs);

			if (existingDocs) {
				existingDocs.forEach(doc => {
					if (doc.document_type in documentsFound) {
						documentsFound[doc.document_type] = true;
						totalDocuments++;
						console.log('Existing document found:', doc.document_type);
					}
				});

				// Trigger reactivity
				documentsFound = { ...documentsFound };

				// Check if all documents are already complete
				if (totalDocuments >= 3) {
					console.log('All documents already exist, redirecting...');
					await checkAndRedirect();
					return;
				}
			}

		} catch (err) {
			console.error('Error checking existing documents:', err);
		}
	}

	// Set up real-time subscription
	function setupRealtimeSubscription() {
		console.log('Setting up real-time subscription for session:', sessionId);
		console.log('Regeneration timestamp:', regenerationTimestamp);
		
		subscription = supabase
			.channel('document_updates')
			.on('postgres_changes', 
				{ 
					event: 'INSERT', 
					schema: 'uniqu', 
					table: 'generated_documents',
					filter: `session_id=eq.${sessionId}`
				}, 
				(payload) => {
					console.log('New document generated:', payload.new);
					
					// Only count documents created after regeneration timestamp
					if (regenerationTimestamp && payload.new.created_at >= regenerationTimestamp) {
						const docType = payload.new.document_type;
						console.log('Processing document type:', docType);
						
						if (docType in documentsFound && !documentsFound[docType]) {
							documentsFound[docType] = true;
							totalDocuments++;
							
							console.log('Document completed:', docType, 'Total:', totalDocuments);
							
							// Trigger reactivity by creating a new object
							documentsFound = { ...documentsFound };
							
							// Check if we should redirect
							checkAndRedirect();
						}
					} else {
						console.log('Document ignored - before regeneration timestamp or not in target types');
					}
				}
			)
			.subscribe((status) => {
				console.log('Subscription status:', status);
			});
	}

	onMount(async () => {
		startTimer();
		await getRegenerationTimestamp();
		await checkExistingDocuments();
		setupRealtimeSubscription();
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (subscription) subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Generating Your Career Analysis - UniqU</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="max-w-2xl mx-auto text-center">
		
		<!-- Main Loading Animation -->
		<div class="w-32 h-32 mx-auto mb-8 relative">
			<div class="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
			<div class="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
			<div class="absolute inset-4 border-4 border-purple-200 rounded-full"></div>
			<div class="absolute inset-4 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" style="animation-delay: -0.15s; animation-duration: 1.5s;"></div>
		</div>

		<!-- Heading -->
		<h1 class="text-4xl font-bold text-gray-900 mb-4">
			🚀 Generating Your Career Analysis
		</h1>
		
		<p class="text-xl text-gray-600 mb-8">
			Our AI is analyzing your responses and creating personalized career guidance documents...
		</p>

		<!-- Timer -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
			<div class="flex items-center justify-center space-x-4 mb-4">
				<svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="text-2xl font-mono font-bold text-gray-900">{formatTime(timeElapsed)}</span>
			</div>
			<p class="text-sm text-gray-600">
				Analysis typically takes one to two minutes to complete
			</p>
		</div>

		<!-- Progress Indicator -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Documents Being Generated</h3>
			
			<!-- Early Reading Message -->
			{#if totalDocuments > 0 && totalDocuments < 3}
				<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						💡 <strong>Don't want to wait?</strong> You can start reading the completed documents below while the others finish generating!
					</p>
				</div>
			{/if}
			
			<div class="space-y-3">
				<!-- Reflection Letter -->
				<div class="flex items-center space-x-3">
					{#if documentsFound.reflection_letter}
						<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<a href="/results/{sessionId}/reflection_letter" class="text-green-700 font-medium hover:text-green-800 transition-colors cursor-pointer">
							📝 Reflection Letter - Complete! (Click to read)
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">📝 Reflection Letter - Generating...</span>
					{/if}
				</div>

				<!-- Career Themes -->
				<div class="flex items-center space-x-3">
					{#if documentsFound.career_themes}
						<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<a href="/results/{sessionId}/career_themes" class="text-green-700 font-medium hover:text-green-800 transition-colors cursor-pointer">
							🎯 Career Themes - Complete! (Click to read)
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">🎯 Career Themes - Generating...</span>
					{/if}
				</div>

				<!-- Ideal Companies -->
				<div class="flex items-center space-x-3">
					{#if documentsFound.ideal_companies}
						<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<a href="/results/{sessionId}/ideal_companies" class="text-green-700 font-medium hover:text-green-800 transition-colors cursor-pointer">
							🏢 Ideal Companies - Complete! (Click to read)
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">🏢 Ideal Companies - Generating...</span>
					{/if}
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mt-6">
				<div class="flex justify-between text-sm text-gray-600 mb-2">
					<span>Progress</span>
					<span>{totalDocuments}/3 documents complete</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-2">
					<div 
						class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
						style="width: {(totalDocuments / 3) * 100}%"
					></div>
				</div>
			</div>
		</div>

		<!-- What Happens Next -->
		<div class="bg-indigo-50 rounded-xl p-6">
			<h3 class="text-lg font-semibold text-indigo-900 mb-3">What happens next?</h3>
			<div class="text-sm text-indigo-800 space-y-2">
				<p>✨ Once all <strong>3 documents</strong> are ready, you'll be automatically redirected to view your complete analysis</p>
				<p>📊 Documents are generated in parallel, so they may complete in any order</p>
				<p>💌 You can then create personalized application letters for specific companies</p>
			</div>
		</div>

		<!-- Skip to Results (emergency fallback) -->
		<div class="mt-8">
			<button 
				on:click={() => goto(`/results/${sessionId}`)}
				class="text-indigo-600 hover:text-indigo-800 text-sm transition-colors"
				type="button"
			>
				Having issues? Skip to results →
			</button>
		</div>
	</div>
</div>