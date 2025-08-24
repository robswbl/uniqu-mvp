<!-- src/routes/results/[sessionId]/[documentType]/+page.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import './document-content.css';
	import { get } from 'svelte/store';
	import { t } from 'svelte-i18n';

	// Replace static assignment with reactive declarations
	$: sessionId = $page.params.sessionId;
	$: documentType = $page.params.documentType;

	let documentData: any = null;
	let isLoading = true;

	async function fetchDocument() {
		isLoading = true;
		documentData = null;
		try {
			const { data, error } = await supabase
				.from('generated_documents')
				.select('content_html, document_type, created_at, pdf_url')
				.eq('session_id', sessionId)
				.eq('document_type', documentType)
				.order('created_at', { ascending: false })
				.limit(1);
			if (error) {
				console.error('Supabase error:', error);
			} else if (data && data.length > 0) {
				documentData = data[0];
			}
		} catch (err) {
			console.error('Unexpected error:', err);
		} finally {
			isLoading = false;
		}
	}

	// Remove onMount(fetchDocument); as the reactive statement will handle all cases.

	$: if ($page.params.documentType) {
		fetchDocument();
	}

	$: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';

	function getDocumentTitle(type: string): string {
		switch (type) {
			case 'reflection_letter':
				return $t('document.reflection_letter');
			case 'career_themes':
				return $t('document.career_themes');
			case 'ideal_companies':
				return $t('document.ideal_companies');
			case 'matching_companies':
				return $t('document.matching_companies');
			case 'application_letter':
				return $t('document.application_letter');
			default:
				return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
		}
	}

	function getDocumentDescription(type: string): string {
		switch (type) {
			case 'reflection_letter':
				return $t('document.reflection_letter_desc');
			case 'career_themes':
				return $t('document.career_themes_desc');
			case 'ideal_companies':
				return $t('document.ideal_companies_desc');
			case 'matching_companies':
				return $t('document.matching_companies_desc');
			case 'application_letter':
				return $t('document.application_letter_desc');
			default:
				return $t('document.default_desc');
		}
	}

	function processHtmlContent(html: string): string {
		if (!html) return '';

		// Remove inline styles that might be causing font size issues
		return html
			.replace(/style="[^"]*font-size[^"]*"/gi, '') // Remove font-size from style attributes
			.replace(/style="[^"]*font-family[^"]*"/gi, '') // Remove font-family from style attributes
			.replace(/style="[^"]*"/gi, '') // Remove all style attributes
			.replace(/font-size:\s*[^;]+;?/gi, '') // Remove font-size from style content
			.replace(/font-family:\s*[^;]+;?/gi, ''); // Remove font-family from style content
	}

	function downloadDocument(): void {
		if (!documentData) {
			alert('No document to download');
			return;
		}

		if (!documentData.pdf_url) {
			alert('PDF not available for this document');
			return;
		}

		try {
			console.log('Starting PDF download from URL:', documentData.pdf_url);

			const title = getDocumentTitle(documentData.document_type);
			const link = document.createElement('a');
			link.href = documentData.pdf_url;
			link.download = `${title.replace(/\s+/g, '_')}_UniqU.pdf`;
			link.target = '_blank'; // Open in new tab as backup

			// Append to body, click, and remove
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			console.log('PDF download initiated');
		} catch (error) {
			console.error('PDF download failed:', error);
			alert('PDF download failed. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>{getDocumentTitle(documentType)} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="mx-auto max-w-6xl">
		{#if !fromOnboarding}
			<!-- Header -->
			<div class="mb-6">
				<button
					on:click={() => goto(`/results/${sessionId}`)}
					class="mb-3 inline-flex items-center text-indigo-600 transition-colors duration-200 hover:text-indigo-800"
					type="button"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					{$t('document.back_to_results')}
				</button>
				<div>
					<h1 class="mb-1 text-xl font-bold text-gray-900">{getDocumentTitle(documentType)}</h1>
					<p class="text-sm text-gray-600">{getDocumentDescription(documentType)}</p>
				</div>
			</div>
		{/if}
		{#if isLoading}
			<div class="flex h-64 items-center justify-center">
				<div class="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
			</div>
		{:else if documentData}
			<!-- Document Content -->
			<div class="relative overflow-hidden rounded-xl bg-white shadow-lg">
				<div class="document-content px-16 py-12">
					{@html processHtmlContent(documentData.content_html)}
				</div>

				<!-- Download button positioned in bottom-right of document -->
				<div class="absolute right-4 bottom-4">
					<button
						on:click={downloadDocument}
						class="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-green-700"
						type="button"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 10v6m0 0l-4-4m4 4l4-4m-6 4h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2h8"
							/>
						</svg>
						<span>{$t('buttons.download')}</span>
					</button>
				</div>
			</div>


			<div class="mt-8 flex justify-center">
				{#if documentType === 'reflection_letter'}
					<button
						on:click={() =>
							goto(
								`/results/${sessionId}/career_themes${fromOnboarding ? '?from=onboarding' : ''}`
							)}
						class="rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:from-pink-600 hover:to-orange-600"
					>
						{$t('document.reveal_next_insight')}
					</button>
				{:else if documentType === 'career_themes'}
					<button
						on:click={() =>
							goto(
								`/results/${sessionId}/ideal_companies${fromOnboarding ? '?from=onboarding' : ''}`
							)}
						class="rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:from-pink-600 hover:to-orange-600"
					>
						{$t('document.reveal_final_suggestion')}
					</button>
				{:else if documentType === 'ideal_companies'}
					<button
						on:click={() =>
							goto(`/results/${sessionId}/next-steps${fromOnboarding ? '?from=onboarding' : ''}`)}
						class="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-colors hover:from-indigo-600 hover:to-purple-600"
					>
						{$t('document.see_what_happens_next')}
					</button>
				{/if}
			</div>
		{:else}
			<div class="rounded-xl bg-white p-8 text-center shadow-lg">
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
				>
					<svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>
				<h2 class="mb-2 text-xl font-semibold text-gray-800">{$t('document.not_found')}</h2>
				<p class="mb-4 text-lg text-red-500">
					{$t('document.not_found_desc')}
				</p>
				<div class="flex justify-center space-x-4">
					<button
						on:click={() => goto(`/results/${sessionId}`)}
						class="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700"
						type="button"
					>
						{$t('document.back_to_results')}
					</button>
					<button
						on:click={() => goto(`/dashboard/${sessionId}`)}
						class="rounded-lg bg-gray-500 px-6 py-2 font-semibold text-white hover:bg-gray-600"
						type="button"
					>
						{$t('document.dashboard')}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
