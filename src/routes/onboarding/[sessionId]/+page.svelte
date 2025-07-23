<!-- src/routes/onboarding/[sessionId]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { t } from 'svelte-i18n';

	export let data;
	const { sessionId } = data;

	let userFirstName = '';
	let currentStep = 0;
	let selectedSituation = '';
	let isSubmitting = false;
	let userId = '';
	let whereNow = '';
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	const situations = [
		{
			id: 'laid-off',
			title: $t('onboarding.option_laid_off'),
			description: $t('onboarding.option_laid_off'),
			icon: '💔',
			tone: 'supportive',
			message: ''
		},
		{
			id: 'quit',
			title: $t('onboarding.option_quit'),
			description: $t('onboarding.option_quit'),
			icon: '🦁',
			tone: 'encouraging',
			message: ''
		},
		{
			id: 'career-change',
			title: $t('onboarding.option_career_change'),
			description: $t('onboarding.option_career_change'),
			icon: '🔄',
			tone: 'inspiring',
			message: ''
		},
		{
			id: 'retirement',
			title: $t('onboarding.option_retirement'),
			description: $t('onboarding.option_retirement'),
			icon: '🌟',
			tone: 'celebratory',
			message: ''
		},
		{
			id: 'burnout',
			title: $t('onboarding.option_burnout'),
			description: $t('onboarding.option_burnout'),
			icon: '🕯️',
			tone: 'gentle',
			message: ''
		},
		{
			id: 'other',
			title: $t('onboarding.option_other'),
			description: $t('onboarding.option_other'),
			icon: '💭',
			tone: 'open',
			message: ''
		}
	];

	onMount(async () => {
		// Fetch session data to get user info
		const { data: sessionData, error: sessionError } = await supabase
			.from('questionnaire_sessions')
			.select('user_id, where_now')
			.eq('id', sessionId)
			.single();

		console.log('Session data:', sessionData, 'Error:', sessionError);

		if (sessionData?.user_id) {
			userId = sessionData.user_id;
			
			// Fetch user first name for personalization
			const { data: user, error: userError } = await supabase
				.from('users')
				.select('user_firstname')
				.eq('user_uuid', sessionData.user_id)
				.single();

			console.log('User data:', user, 'Error:', userError);
			
			if (user?.user_firstname) {
				userFirstName = user.user_firstname;
			}
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
	<div class="max-w-4xl mx-auto px-4 py-8">
		
		<!-- Back Button -->
		<button 
			on:click={goBack}
			class="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200 mb-8"
			type="button"
		>
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
			{$t('buttons.back')}
		</button>

		{#if currentStep === 0}
			<!-- Step 1: Welcome and Situation Selection -->
			<div class="text-center mb-12">
				<div class="mb-8">
					<h1 class="text-4xl font-bold text-gray-900 mb-4">
						{$t('onboarding.welcome')}
					</h1>
					<p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
						{$t('app.subtitle')}
					</p>
				</div>

				<div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
					<h2 class="text-2xl font-semibold text-gray-800 mb-6">
						{$t('onboarding.question')}
					</h2>
					<p class="text-gray-600 mb-8">
						{$t('onboarding.understanding_situation')}
					</p>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each situations as situation}
							<button
								on:click={() => selectSituation(situation.id)}
								class="text-left p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group"
								type="button"
							>
								<div class="flex items-start space-x-4">
									<span class="text-3xl">{situation.icon}</span>
									<div class="flex-1">
										<h3 class="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
											{situation.title}
										</h3>
										<p class="text-sm text-gray-600 mt-1">
											{situation.description}
										</p>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<div class="bg-blue-50 border border-blue-200 rounded-xl p-6">
					<div class="flex items-start space-x-4">
						<svg class="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div>
							<h3 class="font-medium text-blue-900 mb-2">{$t('onboarding.what_to_expect_title')}</h3>
							<p class="text-blue-700 text-sm">
								{$t('onboarding.what_to_expect_desc')}
							</p>
						</div>
					</div>
				</div>
			</div>

		{:else if currentStep === 1}
			<!-- Step 2: Confirmation and Next Steps -->
			<div class="max-w-2xl mx-auto text-center">
				{#if selectedSituation}
					{@const situation = situations.find(s => s.id === selectedSituation)}
					{#if situation}
						<div class="mb-8">
							<span class="text-6xl mb-4 block">{situation.icon}</span>
							<h1 class="text-3xl font-bold text-gray-900 mb-4">
								{situation.title}
							</h1>
							<p class="text-xl text-gray-600 leading-relaxed mb-8">
								{situation.message}
							</p>
						</div>

						<!-- New where_now textarea -->
						<textarea
							class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none p-4 text-gray-700 placeholder-gray-400 mb-8"
							rows="3"
							placeholder={$t('onboarding.where_now_placeholder')}
							bind:value={whereNow}
							on:input={handleWhereNowInput}
						></textarea>

						<div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
							<h2 class="text-2xl font-semibold text-gray-800 mb-6">
								{$t('onboarding.step2_title')}
							</h2>
							<p class="text-gray-600 mb-6">
								{$t('onboarding.step2_desc')}
							</p>
							
							<div class="space-y-4 text-left">
								<div class="flex items-start space-x-3">
									<div class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
										<span class="text-indigo-600 text-sm font-medium">1</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point1')}</p>
								</div>
								<div class="flex items-start space-x-3">
									<div class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
										<span class="text-indigo-600 text-sm font-medium">2</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point2')}</p>
								</div>
								<div class="flex items-start space-x-3">
									<div class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
										<span class="text-indigo-600 text-sm font-medium">3</span>
									</div>
									<p class="text-gray-700">{$t('onboarding.step2_point3')}</p>
								</div>
							</div>
						</div>

						<div class="flex flex-col sm:flex-row gap-4 justify-center">
							<button
								on:click={() => currentStep = 0}
								class="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors"
								type="button"
							>
								{$t('buttons.go_back')}
							</button>
							<button
								on:click={startJourney}
								disabled={isSubmitting}
								class="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors flex items-center justify-center"
								type="button"
							>
								{#if isSubmitting}
									<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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