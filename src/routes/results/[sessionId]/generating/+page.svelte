<!-- src/routes/results/[sessionId]/generating/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';
	import { t } from 'svelte-i18n';

	let sessionId = $page.params.sessionId;
	let timeElapsed = 0;
	let timer = null;
	let subscription = null;
	let generationId = null;
	let documentsFound = {
		reflection_letter: false,
		career_themes: false,
		ideal_companies: false
	};
	let totalDocuments = 0;
	let pollInterval = null;

	// Get generation_id from session
	async function getGenerationId() {
		try {
			const { data: sessionData, error } = await supabase
				.from('questionnaire_sessions')
				.select('generation_id')
				.eq('id', sessionId)
				.single();

			if (sessionData) {
				generationId = sessionData.generation_id;
				console.log('Generation ID:', generationId);
			}
		} catch (err) {
			console.error('Error getting generation_id:', err);
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
		if (totalDocuments >= 3) {
			console.log('All documents complete! Redirecting to ready page...');
			if (timer) clearInterval(timer);
			if (subscription) subscription.unsubscribe();
			await goto(`/results/${sessionId}/ready`);
		}
	}

	// Check existing documents (by generation_id)
	async function checkExistingDocuments() {
		if (!generationId) {
			console.log('No generation_id, skipping existing documents check');
			return;
		}

		console.log('Checking existing documents for session:', sessionId);
		console.log('Looking for documents with generation_id:', generationId);

		try {
			const { data: existingDocs, error } = await supabase
				.from('generated_documents')
				.select('document_type, generation_id')
				.eq('session_id', sessionId)
				.eq('generation_id', generationId)
				.in('document_type', ['reflection_letter', 'career_themes', 'ideal_companies']);

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
		console.log('[Realtime] Setting up subscription for generation_id:', generationId, 'session:', sessionId);
		if (subscription) {
			console.log('[Realtime] Unsubscribing from previous subscription');
			subscription.unsubscribe();
		}
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
					console.log('[Realtime] Document event received:', payload);
					console.log('[Realtime] Current generation_id:', generationId, 'Payload generation_id:', payload.new.generation_id);
					const docType = payload.new.document_type;
					if (generationId && payload.new.generation_id === generationId) {
						if (docType in documentsFound && !documentsFound[docType]) {
							documentsFound[docType] = true;
							totalDocuments++;
							console.log('[Realtime] Document completed:', docType, 'Total:', totalDocuments);
							documentsFound = { ...documentsFound };
							checkAndRedirect();
						}
					} else {
						console.log('[Realtime] Document ignored - wrong generation_id or not in target types');
					}
				}
			)
			.subscribe((status) => {
				console.log('[Realtime] Subscription status:', status);
			});
	}

	async function pollGenerationId() {
		try {
			const { data: sessionData, error } = await supabase
				.from('questionnaire_sessions')
				.select('generation_id')
				.eq('id', sessionId)
				.single();
			if (sessionData && sessionData.generation_id !== generationId) {
				console.log('[Polling] Detected new generation_id:', sessionData.generation_id, 'Old:', generationId);
				generationId = sessionData.generation_id;
				// Reset progress state
				documentsFound = {
					reflection_letter: false,
					career_themes: false,
					ideal_companies: false
				};
				totalDocuments = 0;
				if (subscription) {
					console.log('[Polling] Unsubscribing from old subscription');
					subscription.unsubscribe();
				}
				await checkExistingDocuments();
				setupRealtimeSubscription();
			}
		} catch (err) {
			console.error('[Polling] Error polling generation_id:', err);
		}
	}

	onMount(async () => {
		startTimer();
		await getGenerationId();
		await checkExistingDocuments();
		setupRealtimeSubscription();
		pollInterval = setInterval(pollGenerationId, 3000); // poll every 3 seconds
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (subscription) subscription.unsubscribe();
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>{$t('generating.title')} - {$t('app.title')}</title>
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
			🚀 {$t('generating.heading')}
		</h1>
		
		<p class="text-xl text-gray-600 mb-8">
			{$t('generating.description')}
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
				{$t('generating.analysis_time')}
			</p>
		</div>

		<!-- Progress Indicator -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-8">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">{$t('generating.documents_being_generated')}</h3>
			
			<!-- Early Reading Message -->
			{#if totalDocuments > 0 && totalDocuments < 3}
				<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
					<p class="text-sm text-blue-800">
						💡 <strong>{$t('generating.early_reading_strong')}</strong> {$t('generating.early_reading_message')}
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
							📝 {$t('document.reflection_letter')} - {$t('generating.complete_click_to_read')}
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">📝 {$t('document.reflection_letter')} - {$t('generating.generating')}</span>
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
							🎯 {$t('document.career_themes')} - {$t('generating.complete_click_to_read')}
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">🎯 {$t('document.career_themes')} - {$t('generating.generating')}</span>
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
							🏢 {$t('document.ideal_companies')} - {$t('generating.complete_click_to_read')}
						</a>
					{:else}
						<div class="w-6 h-6 border-2 border-gray-300 rounded-full animate-pulse"></div>
						<span class="text-gray-600">🏢 {$t('document.ideal_companies')} - {$t('generating.generating')}</span>
					{/if}
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mt-6">
				<div class="flex justify-between text-sm text-gray-600 mb-2">
					<span>{$t('generating.progress')}</span>
					<span>{totalDocuments}/3 {$t('generating.documents_complete')}</span>
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
			<h3 class="text-lg font-semibold text-indigo-900 mb-3">{$t('generating.what_happens_next')}</h3>
			<div class="text-sm text-indigo-800 space-y-2">
				<p>✨ {$t('generating.auto_redirect')}</p>
				<p>📊 {$t('generating.parallel_generation')}</p>
				<p>💌 {$t('generating.create_application_letters')}</p>
			</div>
		</div>

		<!-- Skip to Results (emergency fallback) -->
		<div class="mt-8">
			<button 
				on:click={() => goto(`/results/${sessionId}`)}
				class="text-indigo-600 hover:text-indigo-800 text-sm transition-colors"
				type="button"
			>
				{$t('generating.skip_to_results')}
			</button>
		</div>
	</div>
</div>