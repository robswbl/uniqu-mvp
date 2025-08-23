<!-- src/routes/onboarding/[sessionId]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';

	export let data;
	const { sessionId } = data;

	let userFirstName = '';
	let userLoaded = false;
	let currentStep = 0;
	let selectedSituation = '';
	let isSubmitting = false;
	let userId = '';
	let whereNow = '';
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	const situations = [
		{
			id: 'laid-off',
			titleKey: 'onboarding.option_laid_off',
			descKey: 'onboarding.option_laid_off_desc',
			icon: '💔',
			tone: 'supportive'
		},
		{
			id: 'quit',
			titleKey: 'onboarding.option_quit',
			descKey: 'onboarding.option_quit_desc',
			icon: '🦁',
			tone: 'encouraging'
		},
		{
			id: 'career-change',
			titleKey: 'onboarding.option_career_change',
			descKey: 'onboarding.option_career_change_desc',
			icon: '🔄',
			tone: 'inspiring'
		},
		{
			id: 'retirement',
			titleKey: 'onboarding.option_retirement',
			descKey: 'onboarding.option_retirement_desc',
			icon: '🌟',
			tone: 'celebratory'
		},
		{
			id: 'burnout',
			titleKey: 'onboarding.option_burnout',
			descKey: 'onboarding.option_burnout_desc',
			icon: '🕯️',
			tone: 'gentle'
		},
		{
			id: 'other',
			titleKey: 'onboarding.option_other',
			descKey: 'onboarding.option_other_desc',
			icon: '💭',
			tone: 'open'
		}
	];

	onMount(async () => {
		// Get current user ID from localStorage
		const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
		console.log('Current user ID from localStorage:', currentUserId);

		// Fetch session data to get user info
		console.log('Fetching session data for sessionId:', sessionId);
		const { data: sessionData, error: sessionError } = await supabase
			.from('questionnaire_sessions')
			.select('user_id, where_now')
			.eq('id', sessionId)
			.single();

		if (sessionData?.user_id) {
			userId = sessionData.user_id;

			// Security check: ensure current user can access this session
			if (currentUserId && currentUserId !== userId) {
				// Redirect to current user's session if available
				const { data: userSession } = await supabase
					.from('questionnaire_sessions')
					.select('id')
					.eq('user_id', currentUserId)
					.maybeSingle();

				if (userSession) {
					goto(`/onboarding/${userSession.id}`);
					return;
				} else {
					goto('/');
					return;
				}
			}

			// Fetch user first name for personalization (robust, like dashboard)
			const { data: user, error: userError } = await supabase
				.from('users')
				.select('user_firstname')
				.eq('user_uuid', sessionData.user_id)
				.single();

			if (user && user.user_firstname) {
				userFirstName = user.user_firstname;
			} else {
				userFirstName = '';
			}
			userLoaded = true;
		} else {
			userLoaded = true; // Still set to true even if no user_id
		}
		if (sessionData?.where_now) whereNow = sessionData.where_now;
	});

	function selectSituation(situationId: string) {
		selectedSituation = situationId;
		currentStep = 1;
	}

	function handleWhereNowInput() {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			await supabase
				.from('questionnaire_sessions')
				.update({ where_now: whereNow })
				.eq('id', sessionId);
		}, 600);
	}

	async function startJourney() {
		isSubmitting = true;

		// Save situation and where_now
		await supabase
			.from('questionnaire_sessions')
			.update({
				user_situation: selectedSituation,
				onboarding_completed: true,
				where_now: whereNow
			})
			.eq('id', sessionId);

		// Fetch first question ID from question_order
		const { data } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();
		const firstQuestionId = data?.order?.[0] || 'goals';

		goto(`/questionnaire/${sessionId}/step1/${firstQuestionId}?from=onboarding`);
		isSubmitting = false;
	}

	function goBack() {
		if (currentStep > 0) {
			currentStep = 0;
			selectedSituation = '';
		} else {
			goto(`/dashboard/${sessionId}`);
		}
	}
</script>

<svelte:head>
	<title>{$t('onboarding.welcome')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<div class="mx-auto max-w-4xl px-4 py-8">
		<!-- Back Button -->
		<button
			on:click={goBack}
			class="mb-8 inline-flex items-center text-gray-600 transition-colors duration-200 hover:text-gray-800"
			type="button"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			{$t('buttons.back')}
		</button>

		{#if currentStep === 0}
			<!-- Step 1: Welcome and Situation Selection -->
			<div class="mb-12 text-center">
				{#if !userLoaded}
					<div class="mb-8">
						<div
							class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
						></div>
						<p class="text-gray-600">Loading user data...</p>
					</div>
				{:else}
					<div class="mb-8">
						<h1 class="mb-4 text-4xl font-bold text-gray-900">
							{userFirstName
								? `Welcome to UniqU, ${userFirstName}!`
								: `Welcome to UniqU, ${$t('onboarding.generic_name')}!`}
						</h1>

						<p class="mx-auto max-w-3xl text-xl leading-relaxed text-gray-600">
							{$t('app.subtitle')}
						</p>
					</div>
				{/if}

				<div class="mb-8 rounded-2xl bg-white p-8 shadow-lg">
					<h2 class="mb-6 text-2xl font-semibold text-gray-800">
						{$t('onboarding.question')}
					</h2>
					<p class="mb-8 text-gray-600">
						{$t('onboarding.understanding_situation')}
					</p>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						{#each situations as situation}
							<button
								on:click={() => selectSituation(situation.id)}
								class="group rounded-xl border-2 border-gray-200 p-6 text-left transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
								type="button"
							>
								<div class="flex items-start space-x-4">
									<span class="text-3xl">{situation.icon}</span>
									<div class="flex-1">
										<h3
											class="font-semibold text-gray-800 transition-colors group-hover:text-indigo-600"
										>
											{$t(situation.titleKey)}
										</h3>
										<p class="mt-1 text-sm text-gray-600">
											{$t(situation.descKey)}
										</p>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="rounded-xl border border-blue-200 bg-blue-50 p-6">
					<div class="flex items-start space-x-4">
						<svg
							class="mt-1 h-6 w-6 flex-shrink-0 text-blue-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div>
							<h3 class="mb-2 font-medium text-blue-900">
								{$t('onboarding.what_to_expect_title')}
							</h3>
							<p class="text-sm text-blue-700">
								{$t('onboarding.what_to_expect_desc')}
							</p>
						</div>
					</div>
				</div>
			</div>
		{:else if currentStep === 1}
			<!-- Step 2: Confirmation and Next Steps -->
			<div class="mx-auto max-w-2xl text-center">
				{#if selectedSituation}
					{@const situation = situations.find((s) => s.id === selectedSituation)}
					{#if situation}
						<div class="mb-8">
							<span class="mb-4 block text-6xl">{situation.icon}</span>
							<h1 class="mb-4 text-3xl font-bold text-gray-900">
								{$t(situation.titleKey)}
							</h1>
							<p class="mb-8 text-xl leading-relaxed text-gray-600">
								{$t(situation.titleKey)}
							</p>
						</div>

						<!-- New where_now textarea -->
						<textarea
							class="mb-8 w-full resize-none rounded-xl border-gray-300 p-4 text-gray-700 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
							rows="3"
							placeholder={$t('onboarding.where_now_placeholder')}
							bind:value={whereNow}
							on:input={handleWhereNowInput}
						></textarea>

						<div class="mb-8 rounded-2xl bg-white p-8 shadow-lg">
							<h2 class="mb-6 text-2xl font-semibold text-gray-800">
								{$t('onboarding.step2_title')}
							</h2>
							<p class="mb-6 text-gray-600">
								{$t('onboarding.step2_desc')}
							</p>

							<div class="space-y-4 text-left">
								<div class="flex items-start space-x-3">
									<div
										class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100"
									>
										<span class="text-sm font-medium text-indigo-600">1</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point1')}</p>
								</div>
								<div class="flex items-start space-x-3">
									<div
										class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100"
									>
										<span class="text-sm font-medium text-indigo-600">2</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point2')}</p>
								</div>
								<div class="flex items-start space-x-3">
									<div
										class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100"
									>
										<span class="text-sm font-medium text-indigo-600">3</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point3')}</p>
								</div>
							</div>
						</div>

						<div class="flex flex-col justify-center gap-4 sm:flex-row">
							<button
								on:click={() => (currentStep = 0)}
								class="rounded-lg border-2 border-gray-300 px-8 py-3 text-gray-700 transition-colors hover:border-gray-400"
								type="button"
							>
								{$t('buttons.go_back')}
							</button>
							<button
								on:click={startJourney}
								disabled={isSubmitting}
								class="flex items-center justify-center rounded-lg bg-indigo-600 px-8 py-3 text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
								type="button"
							>
								{#if isSubmitting}
									<svg
										class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									{$t('onboarding.starting_journey')}
								{:else}
									{$t('onboarding.begin_journey')}
								{/if}
							</button>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>
