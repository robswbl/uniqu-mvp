<script lang="ts">
	import { t } from 'svelte-i18n';
	import { waitLocale } from '$lib/i18n';
	
	// Wait for i18n to load
	waitLocale();
</script>

<svelte:head>
	<title>{$t('admin.nav.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('admin.nav.heading')}</h1>
		<p class="text-gray-600">{$t('admin.nav.subheading')}</p>
	</div>
	
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.signup_codes')}</h3>
			<p class="text-gray-600 mb-4">{$t('admin.nav.signup_codes_desc')}</p>
			<a href="/admin/signup-codes" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				{$t('admin.nav.access')}
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.assign_agency')}</h3>
			<p class="text-gray-600 mb-4">{$t('admin.nav.assign_agency_desc')}</p>
			<a href="/admin/assign-agency" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				{$t('admin.nav.access')}
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.agency_overview')}</h3>
			<p class="text-gray-600 mb-4">{$t('admin.nav.agency_overview_desc')}</p>
			<a href="/admin/agency-overview" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				{$t('admin.nav.access')}
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.agency_users')}</h3>
			<p class="text-gray-600 mb-4">{$t('admin.nav.agency_users_desc')}</p>
			<a href="/admin/agency-users" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				{$t('admin.nav.access')}
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.question_order')}</h3>
			<p class="text-gray-600 mb-4">{$t('admin.nav.question_order_desc')}</p>
			<a href="/admin/question-order" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				{$t('admin.nav.access')}
			</a>
		</div>
	</div>
</div>
