<script context="module" lang="ts">
	import { setupI18n } from '$lib/i18n';
	// Always set a default locale for SSR
	setupI18n('en');
</script>

<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { locale, waitLocale } from '$lib/i18n';
	import { t } from 'svelte-i18n';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let userLang = '';
	let localeReady = false;
	let userId = '';
	let errorMsg = '';
	let userData: any = null;
	let showProfileMenu = false;
	let profileMenuRef: HTMLElement | null = null;
	let profileButtonRef: HTMLElement | null = null;

	// Public routes where avatar/name should be hidden
	const publicRoutes = [
		'/',
		'/signup',
		'/create-user',
		'/agency/login',
		'/agency/signup',
		'/agency-portal/login',
		'/agency-portal/signup',
		'/admin'
	];

	// Reactive flag for current route visibility
	$: isPublicRoute = publicRoutes.includes($page.url.pathname);

	// SSR-safe: check if window is defined before accessing localStorage
	if (typeof window !== 'undefined') {
		userLang = localStorage.getItem('userLang') || '';
		// Try to get userId from localStorage/sessionStorage or URL if available
		userId = localStorage.getItem('userId') || '';
	}

	let availableLangs = [
		{ code: 'en', label: 'English' },
		{ code: 'de', label: 'Deutsch' },
		{ code: 'fr', label: 'Français' },
		{ code: 'it', label: 'Italiano' },
		{ code: 'es', label: 'Español' }
	];

	// Reactive statement to fetch user data when userId changes
	$: if (userId && !userData) {
		fetchUserData();
	}

	async function fetchUserLanguage() {
		if (userId) {
			const { data, error } = await supabase
				.from('users')
				.select('user_language')
				.eq('user_uuid', userId)
				.single();
			if (data && data.user_language) {
				userLang = data.user_language;
				locale.set(userLang);
				localStorage.setItem('userLang', userLang);
			}
		}
	}

	waitLocale().then(() => {
		localeReady = true;
	});

	onMount(async () => {
		// Guard: If userId is missing and not on public routes, redirect to root
		if (typeof window !== 'undefined') {
			const currentUserId = localStorage.getItem('userId');
			const publicRoutes = ['/', '/signup', '/create-user', '/agency/login', '/agency/signup', '/agency-portal/login', '/agency-portal/signup', '/admin'];
			const currentPath = window.location.pathname;

			if (!currentUserId && !publicRoutes.includes(currentPath)) {
				goto('/');
				return;
			}

			// Update the top-level userId variable
			if (currentUserId) {
				userId = currentUserId;
				await fetchUserLanguage();
				await fetchUserData();
			} else {
				userLang = localStorage.getItem('userLang') || '';
				if (userLang) {
					locale.set(userLang);
					waitLocale();
				}
			}
		}
	});

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				showProfileMenu &&
				profileMenuRef &&
				!profileMenuRef.contains(event.target as Node) &&
				profileButtonRef &&
				!profileButtonRef.contains(event.target as Node)
			) {
				showProfileMenu = false;
			}
		}
		document.addEventListener('mousedown', handleClickOutside);

		// Safari button visibility fix
		function ensureButtonVisibility() {
			const buttons = document.querySelectorAll('button');
			buttons.forEach((button) => {
				button.style.display = 'flex';
				button.style.visibility = 'visible';
				button.style.opacity = '1';
				button.style.position = 'relative';
				button.style.zIndex = '1';
			});
		}

		// Run immediately and after a short delay
		ensureButtonVisibility();
		setTimeout(ensureButtonVisibility, 100);
		setTimeout(ensureButtonVisibility, 500);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	});

	async function fetchUserData() {
		if (userId) {
			console.log('DEBUG: Layout fetching user data for userId:', userId);
			const { data, error } = await supabase
				.from('users')
				.select('user_firstname, user_lastname, user_email')
				.eq('user_uuid', userId)
				.single();
			console.log('DEBUG: Layout user fetch result:', { data, error });
			if (!error && data) {
				userData = data;
				console.log('DEBUG: Layout userData set:', userData);
				console.log('DEBUG: Layout userData.user_firstname:', userData.user_firstname);
			}
		}
	}

	async function changeLang(lang: string) {
		locale.set(lang);
		if (typeof window !== 'undefined') {
			localStorage.setItem('userLang', lang);
		}
		// If userId is available, update in DB
		if (userId) {
			const { error } = await supabase
				.from('users')
				.update({ user_language: lang })
				.eq('user_uuid', userId);
			if (error) {
				errorMsg = 'Failed to update language in your profile. Please try again.';
			} else {
				errorMsg = '';
			}
		} else {
			errorMsg = 'You must be logged in to save your language preference.';
		}
	}
</script>

{#if localeReady}
	<!-- Only show main layout for non-agency routes -->
	{#if !$page.url.pathname.startsWith('/agency')}
		<div class="flex min-h-screen flex-col">
			<header class="flex items-center justify-between bg-white p-4 shadow">
				{#if $page.params?.sessionId}
					<a
						href="/dashboard/{$page.params.sessionId}"
						class="text-2xl font-bold text-indigo-700 hover:underline">{$t('app.title')}</a
					>
				{:else}
					<a href="/" class="text-2xl font-bold text-indigo-700 hover:underline">{$t('app.title')}</a>
				{/if}
				<div class="flex items-center space-x-4">
					{#if $page.params?.sessionId}
						<a
							href="/dashboard/{$page.params.sessionId}"
							class="flex items-center space-x-1 font-medium text-gray-700 transition-colors hover:text-indigo-600"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"
								/>
							</svg>
							<span>{$t('layout.dashboard')}</span>
						</a>
					{/if}
					<div class="relative inline-flex items-center">
						<select
							class="appearance-none rounded-lg border bg-none p-2 pr-8 text-base font-normal text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							bind:value={$locale}
							on:change={(e) => changeLang((e.target as HTMLSelectElement).value)}
							aria-label="Select language"
						>
							{#each availableLangs as lang}
								<option value={lang.code}>{lang.label}</option>
							{/each}
						</select>
						<svg
							class="pointer-events-none absolute right-2 h-4 w-4 text-gray-400"
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

					<!-- Profile Avatar (hidden on public routes) -->
					{#if userData && !isPublicRoute}
						<div class="relative">
							<button
								bind:this={profileButtonRef}
								on:click={() => (showProfileMenu = !showProfileMenu)}
								class="flex items-center space-x-2 rounded-lg p-2 transition-colors hover:bg-gray-100"
								type="button"
							>
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white"
								>
									{userData.user_firstname ? userData.user_firstname.charAt(0).toUpperCase() : 'U'}
								</div>
								<span class="hidden text-sm font-medium text-gray-700 sm:block">
									{userData.user_firstname || 'User'}
								</span>
								<svg
									class="h-4 w-4 text-gray-400"
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
							</button>

							<!-- Profile Dropdown Menu -->
							{#if showProfileMenu}
								<div
									bind:this={profileMenuRef}
									class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
								>
									<a
										href={$page.params?.sessionId ? `/profile/${$page.params.sessionId}` : '/profile'}
										class="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100"
									>
										{$t('layout.profile_settings')}
									</a>
									<div class="my-1 border-t border-gray-200"></div>
									<button
										on:click={() => {
											showProfileMenu = false;
											// Clear user data from localStorage
											if (typeof window !== 'undefined') {
												localStorage.removeItem('userId');
												localStorage.removeItem('userLang');
											}
											// Clear user data
											userData = null;
											userId = '';
											goto('/');
										}}
										class="block w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
										type="button"
									>
										{$t('layout.sign_out')}
									</button>
								</div>
							{/if}
						</div>
					{/if}

					{#if errorMsg}
						<div class="mt-1 text-xs text-red-600">{errorMsg}</div>
					{/if}
				</div>
			</header>
			<main class="flex-1">
				<slot />
			</main>
		</div>
	{:else}
		<!-- For agency routes, just render the slot without main layout -->
		<slot />
	{/if}
{/if}
