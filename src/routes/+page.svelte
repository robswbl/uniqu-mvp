<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { t, waitLocale } from 'svelte-i18n';
	import bcrypt from 'bcryptjs';

	let userEmail = '';
	let userPassword = '';
	let isLoading = false;
	let feedbackMessage = '';
	let localeReady = false;

	waitLocale().then(() => {
		localeReady = true;
	});

	async function handleStart() {
		if (!userEmail) {
			alert($t('landing.enter_email_alert'));
			return;
		}
		if (!userPassword) {
			alert('Please enter your password.');
			return;
		}
		isLoading = true;
		feedbackMessage = '';

		try {
			// 1. Find the user
			const { data: userData, error: userError } = await supabase
				.from('users')
				.select('user_uuid, password_hash')
				.eq('user_email', userEmail)
				.single();
			console.log('User lookup:', { userData, userError });

			if (userError || !userData) {
				alert($t('landing.user_not_found'));
				throw new Error($t('landing.user_not_found_generic'));
			}
			// 2. Check password
			const passwordMatch = await bcrypt.compare(userPassword, userData.password_hash || '');
			if (!passwordMatch) {
				feedbackMessage = 'Incorrect password.';
				isLoading = false;
				return;
			}
			// Save userId for language persistence
			if (typeof window !== 'undefined') {
				localStorage.setItem('userId', userData.user_uuid);
			}

			// 3. Find their session
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('id, status')
				.eq('user_id', userData.user_uuid)
				.maybeSingle();
			console.log('Session lookup:', { sessionData, sessionError });

			let sessionId, sessionStatus;

			if (sessionError && sessionError.code === 'PGRST116') {
				// No session exists - create one
				console.log('No session found, creating new session for user:', userData.user_uuid);
				const { data: newSession, error: createError } = await supabase
					.from('questionnaire_sessions')
					.insert({
						user_id: userData.user_uuid,
						status: 'in-progress'
					})
					.select('id, status')
					.single();
				console.log('Session creation:', { newSession, createError });

				if (createError) throw createError;
				sessionId = newSession.id;
				sessionStatus = newSession.status;
			} else if (sessionError) {
				console.error('Session fetch error:', sessionError);
				throw sessionError;
			} else {
				// Add null check for sessionData before accessing its properties
				if (sessionData) {
					sessionId = sessionData.id;
					sessionStatus = sessionData.status;
				} else {
					throw new Error($t('landing.session_not_found'));
				}
			}

			console.log('Session info:', { sessionId, sessionStatus });

			// 🚀 SMART ROUTING LOGIC
			if (sessionStatus === 'completed') {
				feedbackMessage = $t('landing.welcome_back');
				setTimeout(async () => {
					await goto(`/dashboard/${sessionId}`);
				}, 1500);
			} else {
				// Check if onboarding is completed
				const { data: sessionDetails, error: detailsError } = await supabase
					.from('questionnaire_sessions')
					.select('onboarding_completed')
					.eq('id', sessionId)
					.single();
				console.log('Session details lookup:', { sessionDetails, detailsError });
				if (!sessionDetails?.onboarding_completed) {
					feedbackMessage = $t('landing.welcome_start');
					setTimeout(async () => {
						await goto(`/onboarding/${sessionId}`);
					}, 1000);
				} else {
					feedbackMessage =
						sessionStatus === 'in-progress' ? $t('landing.resuming') : $t('landing.starting');
					setTimeout(async () => {
						await goto(`/questionnaire/${sessionId}`);
					}, 1000);
				}
			}
		} catch (e) {
			let message = $t('landing.unknown_error');
			if (e instanceof Error) {
				message = e.message;
			}
			console.error('Full error:', e);
			feedbackMessage = `Error: ${message}`;
		} finally {
			isLoading = false;
		}
	}
</script>

{#if localeReady}
	<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
		<div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
			<div class="text-center">
				<h1 class="text-3xl font-bold text-gray-800">{$t('app.title')}</h1>
				<p class="mt-2 text-gray-600">{$t('landing.subtitle')}</p>
			</div>

			<form class="mt-8 space-y-6" on:submit|preventDefault={handleStart}>
				<div>
					<label for="email" class="sr-only">{$t('landing.email_label')}</label>
					<input
						bind:value={userEmail}
						id="email"
						name="email"
						type="email"
						required
						class="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
						placeholder={$t('landing.email_placeholder')}
						disabled={isLoading}
					/>
				</div>
				<div>
					<label for="password" class="sr-only">Password</label>
					<input
						bind:value={userPassword}
						id="password"
						name="password"
						type="password"
						required
						class="w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none"
						placeholder="Password"
						disabled={isLoading}
					/>
				</div>
				<div>
					<button
						type="submit"
						class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
						disabled={isLoading}
					>
						{#if isLoading}
							<span>{$t('landing.loading')}</span>
						{:else}
							<span>{$t('landing.start')}</span>
						{/if}
					</button>
				</div>
			</form>

			{#if feedbackMessage}
				<p
					class="mt-4 text-center text-sm"
					class:text-red-500={feedbackMessage.startsWith('Error') ||
						feedbackMessage === 'Incorrect password.'}
					class:text-green-600={!feedbackMessage.startsWith('Error') &&
						feedbackMessage !== 'Incorrect password.'}
				>
					{feedbackMessage}
				</p>
			{/if}

			<!-- Agency login link -->
			<div class="mt-6 text-center">
				<a
					href="/agency/login"
					class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
				>
					To log in as an agency, click here
				</a>
			</div>
		</div>
	</div>
{/if}
