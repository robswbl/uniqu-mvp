<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';
	const sessionId = $page.params.sessionId;
	$: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';
	function goToLetters() {
		const param = fromOnboarding ? '?from=onboarding' : '';
		goto(`/results/${sessionId}/letters${param}`);
	}
</script>

<svelte:head>
	<title>{$t('next_steps.title')} | {$t('app.title')}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-6"
>
	<div class="mx-auto w-full max-w-2xl rounded-2xl bg-white p-10 text-center shadow-xl">
		<div class="mb-6 animate-bounce text-6xl">🚀</div>
		<h1 class="mb-6 text-3xl font-bold text-gray-800">{$t('next_steps.heading')}</h1>
		<h2 class="mb-4 text-xl font-semibold text-indigo-700">{$t('next_steps.subheading')}</h2>
		<p class="mb-8 text-lg text-gray-700">
			{$t('next_steps.description')}
		</p>
		<button
			class="mx-auto flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-10 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:from-indigo-600 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
			on:click={goToLetters}
		>
			{$t('next_steps.go_to_application_letters')}
		</button>
	</div>
</div>
