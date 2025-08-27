<script lang="ts">
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>Admin Tools</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('admin.nav.heading')}</h1>
		<p class="text-gray-600">{$t('admin.nav.subheading')}</p>
	</div>
	
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.signup_codes')}</h3>
			<p class="text-gray-600 mb-4">Manage signup codes and their distribution</p>
			<a href="/admin/signup-codes" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				Access
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.assign_agency')}</h3>
			<p class="text-gray-600 mb-4">Assign regular users to agencies</p>
			<a href="/admin/assign-agency" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				Access
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.agency_overview')}</h3>
			<p class="text-gray-600 mb-4">View and manage agency-user relationships</p>
			<a href="/admin/agency-overview" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				Access
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.agency_users')}</h3>
			<p class="text-gray-600 mb-4">Manage agency staff users and assignments</p>
			<a href="/admin/agency-users" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				Access
			</a>
		</div>
		
		<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
			<h3 class="text-lg font-semibold text-gray-800 mb-3">{$t('admin.nav.question_order')}</h3>
			<p class="text-gray-600 mb-4">Manage question order and flow</p>
			<a href="/admin/question-order" class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
				Access
			</a>
		</div>
	</div>
</div>
