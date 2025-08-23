<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { t } from 'svelte-i18n';

	const sessionId = $page.params.sessionId;
	let sessionData: any = null;
	let isLoading = true;
	let hasUnsavedChanges = false;
	let userFirstName = '';
	let userEmail = '';

	// Add helper to get first step1 question from admin order
	const defaultSteps = [
		{
			id: 'step1',
			name: 'Step 1: Your Life Context',
			questions: [
				'goals',
				'personality_values',
				'life_context',
				'doubts_barriers',
				'emotional_landscape'
			]
		},
		{
			id: 'step2',
			name: 'Step 2: Your Professional Experience',
			questions: ['cv']
		},
		{
			id: 'step3',
			name: 'Step 3: Your Ikigai',
			questions: ['love', 'good_at', 'care_about', 'inspires', 'want_to_be']
		}
	];
	let firstStep1Question = 'goals';

	onMount(async () => {
		// Fetch session data
		const { data, error } = await supabase
			.from('questionnaire_sessions')
			.select('*')
			.eq('id', sessionId)
			.single();

		if (data) {
			sessionData = data;

			// Fetch user data for personalization
			if (data.user_id) {
				const { data: user, error: userError } = await supabase
					.from('users')
					.select('user_firstname, user_email')
					.eq('user_uuid', data.user_id)
					.single();

				if (!userError && user) {
					userFirstName = user.user_firstname || '';
					userEmail = user.user_email || '';
				}
			}
		}

		// Fetch first step1 question from question_order
		const { data: orderData } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();
		if (
			orderData &&
			orderData.order &&
			Array.isArray(orderData.order) &&
			orderData.order.length > 0
		) {
			firstStep1Question = orderData.order[0];
		}

		isLoading = false;
	});

	function markAsChanged() {
		hasUnsavedChanges = true;
	}

	function goToStep(step: string) {
		goto(`/questionnaire/${sessionId}/${step}`);
	}

	function goToDashboard() {
		goto(`/dashboard/${sessionId}`);
	}

	// Helper functions to determine if steps are started
	function isStep1Started() {
		return sessionData?.cv_text && sessionData.cv_text.length >= 200;
	}
	function isStep2Started() {
		return sessionData?.ikigai_love && sessionData.ikigai_love.length >= 50;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
	<div class="mx-auto max-w-4xl">
		<!-- Back to Dashboard Navigation -->
		<div class="mb-6 flex items-center justify-between">
			<button
				on:click={goToDashboard}
				class="flex items-center space-x-2 rounded-lg px-4 py-2 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				<span>{$t('questionnaire.back_to_dashboard')}</span>
			</button>

			{#if hasUnsavedChanges}
				<div
					class="flex items-center space-x-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2"
				>
					<svg class="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="text-sm text-yellow-800">{$t('questionnaire.unsaved_changes')}</span>
				</div>
			{/if}
		</div>

		{#if isLoading}
			<div class="rounded-2xl bg-white p-8 text-center shadow-xl">
				<div
					class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
				></div>
				<p class="text-gray-600">{$t('questionnaire.loading_session')}</p>
			</div>
		{:else if sessionData}
			<!-- Welcome Header -->
			<div class="mb-12 text-center">
				<h1 class="mb-4 text-4xl font-bold text-gray-800">
					{userFirstName
						? `${userFirstName}, ${$t('questionnaire.welcome_heading')}`
						: $t('questionnaire.welcome_heading')}
				</h1>
				<p class="mx-auto max-w-2xl text-xl text-gray-600">
					{$t('questionnaire.welcome_subheading')}
				</p>
			</div>

			<!-- Progress Overview -->
			<div class="mb-8 rounded-2xl bg-white p-8 shadow-xl">
				<h2 class="mb-6 text-center text-2xl font-semibold text-gray-800">
					{$t('questionnaire.progress_title')}
				</h2>
				<div class="mb-8 flex items-center justify-center">
					<!-- Step 1 -->
					<div class="flex flex-1 flex-col items-center">
						<div
							class="mb-2 flex h-12 w-12 items-center justify-center rounded-full
				{sessionData.goals ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}"
						>
							{#if sessionData.goals}
								<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{:else}
								<span class="font-semibold">1</span>
							{/if}
						</div>
						<span class="text-sm font-medium text-gray-600">{$t('questionnaire.life_context')}</span
						>
					</div>
					<div class="mx-4 h-0.5 flex-1 {sessionData.goals ? 'bg-green-500' : 'bg-gray-200'}"></div>
					<!-- Step 2 -->
					<div class="flex flex-1 flex-col items-center">
						<div
							class="mb-2 flex h-12 w-12 items-center justify-center rounded-full
				{sessionData.cv_text ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}"
						>
							{#if sessionData.cv_text}
								<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{:else}
								<span class="font-semibold">2</span>
							{/if}
						</div>
						<span class="text-sm font-medium text-gray-600"
							>{$t('questionnaire.professional_experience')}</span
						>
					</div>
					<div
						class="mx-4 h-0.5 flex-1 {sessionData.cv_text ? 'bg-green-500' : 'bg-gray-200'}"
					></div>
					<!-- Step 3 -->
					<div class="flex flex-1 flex-col items-center">
						<div
							class="mb-2 flex h-12 w-12 items-center justify-center rounded-full
				{sessionData.ikigai_love ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}"
						>
							{#if sessionData.ikigai_love}
								<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{:else}
								<span class="font-semibold">3</span>
							{/if}
						</div>
						<span class="text-sm font-medium text-gray-600">{$t('questionnaire.ikigai')}</span>
					</div>
				</div>
			</div>

			<!-- Step Cards -->
			<div class="mb-8 grid gap-6 md:grid-cols-3">
				<!-- Step 1: Life Context -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-xl transition-shadow hover:shadow-2xl"
				>
					<div class="bg-gradient-to-r from-purple-500 to-pink-600 p-6">
						<div class="text-white">
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-lg font-semibold">{$t('questionnaire.life_context')}</h3>
								{#if sessionData.goals}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{/if}
							</div>
							<p class="text-sm text-purple-100">{$t('questionnaire.life_context_intro')}</p>
						</div>
					</div>
					<div class="p-6">
						<p class="mb-4 text-gray-600">
							{$t('questionnaire.life_context_desc')}
						</p>
						<button
							on:click={() => goToStep('step1')}
							class="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
						>
							{sessionData.goals
								? $t('questionnaire.edit_life_context')
								: $t('questionnaire.start_here')}
						</button>
					</div>
				</div>

				<!-- Step 2: Professional Experience -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-xl transition-shadow hover:shadow-2xl"
				>
					<div class="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
						<div class="text-white">
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-lg font-semibold">{$t('questionnaire.professional_experience')}</h3>
								{#if sessionData.cv_text}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{/if}
							</div>
							<p class="text-sm text-blue-100">
								{$t('questionnaire.professional_experience_intro')}
							</p>
						</div>
					</div>
					<div class="p-6">
						<p class="mb-4 text-gray-600">
							{$t('questionnaire.professional_experience_desc')}
						</p>
						<button
							on:click={() => goToStep('step2')}
							class="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
						>
							{sessionData.cv_text
								? $t('questionnaire.edit_experience')
								: $t('questionnaire.start_here')}
						</button>
					</div>
				</div>

				<!-- Step 3: Ikigai -->
				<div
					class="overflow-hidden rounded-2xl bg-white shadow-xl transition-shadow hover:shadow-2xl"
				>
					<div class="bg-gradient-to-r from-green-500 to-teal-600 p-6">
						<div class="text-white">
							<div class="mb-2 flex items-center justify-between">
								<h3 class="text-lg font-semibold">{$t('questionnaire.ikigai')}</h3>
								{#if sessionData.ikigai_love}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{/if}
							</div>
							<p class="text-sm text-green-100">{$t('questionnaire.ikigai_intro')}</p>
						</div>
					</div>
					<div class="p-6">
						<p class="mb-4 text-gray-600">
							{$t('questionnaire.ikigai_desc')}
						</p>
						<button
							on:click={() => goToStep('step3')}
							class="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700"
						>
							{sessionData.ikigai_love
								? $t('questionnaire.edit_ikigai')
								: $t('questionnaire.start_here')}
						</button>
					</div>
				</div>
			</div>

			<!-- Instructions -->
			<div class="rounded-2xl bg-white p-8 text-center shadow-xl">
				<h3 class="mb-3 text-xl font-semibold text-gray-800">{$t('questionnaire.how_it_works')}</h3>
				<p class="mb-4 text-gray-600">
					{$t('questionnaire.how_it_works_desc')}
				</p>
				<div class="text-sm text-gray-500">
					{$t('questionnaire.time_and_privacy')}
				</div>
			</div>

			<!-- User Email Display -->
			{#if userEmail}
				<div class="mt-4 text-center">
					<p class="text-xs text-gray-400">
						{$t('questionnaire.session_for', { email: userEmail } as any)}
					</p>
				</div>
			{/if}
		{:else}
			<div class="rounded-2xl bg-white p-8 text-center shadow-xl">
				<p class="text-lg text-red-500">{$t('questionnaire.session_not_found')}</p>
				<button
					on:click={() => goto('/')}
					class="mt-4 rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700"
				>
					{$t('questionnaire.go_back_home')}
				</button>
			</div>
		{/if}
	</div>
</div>
