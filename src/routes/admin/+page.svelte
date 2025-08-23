<script lang="ts">
	import { t } from 'svelte-i18n';
	let password = '';
	let unlocked = false;
	let error = '';

	function checkPassword() {
		if (password === 'Konrad1982') {
			unlocked = true;
			error = '';
		} else {
			error = 'Incorrect password.';
			unlocked = false;
		}
	}
</script>

<svelte:head>
	<title>Admin Tools</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="mx-auto max-w-xl">
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('admin.nav.heading')}</h1>
			<p class="text-gray-600">{$t('admin.nav.subheading')}</p>
		</div>
		{#if !unlocked}
			<div
				class="mx-auto mb-8 flex max-w-md flex-col items-center rounded-xl border border-gray-200 bg-white p-8 shadow-lg"
			>
				<label
					for="admin-password"
					class="mb-2 block w-full max-w-md text-sm font-medium text-gray-700"
					>{$t('admin.nav.password_label')}</label
				>
				<input
					id="admin-password"
					type="password"
					bind:value={password}
					class="mb-4 w-full max-w-md rounded-lg border border-gray-300 px-4 py-3"
					on:keydown={(e) => e.key === 'Enter' && checkPassword()}
				/>
				<button
					type="button"
					class="w-full max-w-md rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition-all duration-300 hover:bg-indigo-700"
					on:click={checkPassword}>{$t('admin.nav.unlock')}</button
				>
				{#if error}
					<div
						class="mt-4 w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-3 text-red-800"
					>
						{$t('admin.nav.incorrect_password')}
					</div>
				{/if}
			</div>
		{:else}
			<div class="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
				<h2 class="mb-4 text-xl font-semibold text-gray-800">{$t('admin.nav.pages')}</h2>
				<ul class="space-y-4">
					<li>
						<a href="/admin/signup-codes" class="font-medium text-indigo-700 hover:underline"
							>{$t('admin.nav.signup_codes')}</a
						>
					</li>
					<li>
						<a href="/admin/assign-agency" class="font-medium text-indigo-700 hover:underline"
							>{$t('admin.nav.assign_agency')}</a
						>
					</li>
					<li>
						<a href="/admin/question-order" class="font-medium text-indigo-700 hover:underline"
							>{$t('admin.nav.question_order')}</a
						>
					</li>
				</ul>
			</div>
		{/if}
	</div>
</div>
