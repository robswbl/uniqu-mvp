<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>Agency Authentication</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
	<div class="container mx-auto px-4 py-8">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Agency Portal</h1>
			<p class="text-gray-600">Access your agency dashboard and manage your clients</p>
		</div>
		<slot />
	</div>
</div>
