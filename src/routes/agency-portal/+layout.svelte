<script lang="ts">
	import { page } from '$app/stores';
	import { t, locale, waitLocale } from 'svelte-i18n';
	import { onMount } from 'svelte';

	let userLang = 'en';
	let localeReady = false;

	// Wait for locale to be ready
	waitLocale().then(() => {
		localeReady = true;
		console.log('i18n ready, locale:', $locale);
		console.log('Testing translation:', $t('agency.portal_title'));
	}).catch((error) => {
		// Fallback if i18n fails
		localeReady = true;
		console.warn('i18n failed to load, using fallback:', error);
	});

	onMount(async () => {
		// Get language from localStorage if available
		if (typeof window !== 'undefined') {
			userLang = localStorage.getItem('userLang') || 'en';
			await locale.set(userLang);
			console.log('Locale set to:', userLang);
			
			// Force a locale change to trigger translations
			setTimeout(async () => {
				await locale.set('en');
				console.log('Forced locale to en');
				await locale.set(userLang);
				console.log('Restored locale to:', userLang);
			}, 100);
		}
	});

	async function changeLang(lang: string) {
		locale.set(lang);
		if (typeof window !== 'undefined') {
			localStorage.setItem('userLang', lang);
		}
	}
</script>

<svelte:head>
	<title>Agency Portal</title>
</svelte:head>

	<!-- Completely isolated agency layout - NO inheritance from main layout -->
	{#if !localeReady}
		<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading translations...</p>
			</div>
		</div>
	{:else}
		<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
			<!-- Single Agency Header -->
			<header class="bg-white shadow-sm border-b border-gray-200">
				<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div class="flex justify-between items-center py-4">
						<div class="flex items-center">
							<h1 class="text-2xl font-bold text-purple-900">
								{#if localeReady}
									{$t('agency.portal_title')}
								{:else}
									Loading...
								{/if}
							</h1>
						</div>
						<div class="flex items-center space-x-4">
							<!-- Single language selector with proper width -->
							<div class="relative">
								<select
									bind:value={userLang}
									on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
									class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[120px]"
								>
									{#if localeReady}
										<option value="en">{$t('common.english')}</option>
										<option value="de">{$t('common.german')}</option>
										<option value="fr">{$t('common.french')}</option>
										<option value="es">{$t('common.spanish')}</option>
										<option value="it">{$t('common.italian')}</option>
									{:else}
										<option value="en">Loading...</option>
									{/if}
								</select>
								<svg
									class="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</header>

			<!-- Main Content Area -->
			<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<slot />
			</main>
		</div>
	{/if}
