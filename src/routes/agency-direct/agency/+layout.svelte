<script lang="ts">
	import { page } from '$app/stores';
	import { t } from 'svelte-i18n';
	import { locale } from 'svelte-i18n';
	import { onMount } from 'svelte';

	let userLang = 'en';

	onMount(() => {
		// Get language from localStorage if available
		if (typeof window !== 'undefined') {
			userLang = localStorage.getItem('userLang') || 'en';
			locale.set(userLang);
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

<!-- Agency-specific layout that completely replaces main layout -->
<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
	<!-- Clean Agency Header - Single header only -->
	<header class="bg-white shadow-sm border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-4">
				<div class="flex items-center">
					<h1 class="text-2xl font-bold text-purple-900">UniqU Agency Portal</h1>
				</div>
				<div class="flex items-center space-x-4">
					<!-- Single language selector with proper width -->
					<div class="relative">
						<select
							bind:value={userLang}
							on:change={(e) => changeLang(e.target.value)}
							class="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[120px]"
						>
							<option value="en">English</option>
							<option value="de">Deutsch</option>
							<option value="fr">Français</option>
							<option value="es">Español</option>
							<option value="it">Italiano</option>
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
