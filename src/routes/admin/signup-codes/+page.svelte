<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	let codes: any[] = [];
	let isLoading = false;
	let isGenerating = false;
	let count = 1;
	let message = '';
	let messageType = '';
	let markingCode = '';
	let bulkGivenBy = '';
	let bulkComment = '';
	let bulkGeneratedCodes: string[] = [];
	let showBulkActions = false;

	// Sorting and filtering state
	let sortField = 'code';
	let sortDirection = 'asc';
	let statusFilter = 'all';
	let givenOutFilter = 'all';
	let searchTerm = '';

	// Predefined options for given_by dropdown
	const givenByOptions = ['Adrian', 'Antonio', 'Arbela', 'Carron', 'John', 'Rob'];

	// Computed filtered and sorted codes
	$: filteredCodes = codes.filter((code) => {
		// Status filter
		if (statusFilter === 'used' && !code.used) return false;
		if (statusFilter === 'unused' && code.used) return false;

		// Given out filter
		if (givenOutFilter === 'given_out' && !code.given_out) return false;
		if (givenOutFilter === 'available' && code.given_out) return false;

		// Search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			return (
				code.code.toLowerCase().includes(searchLower) ||
				(code.given_by && code.given_by.toLowerCase().includes(searchLower)) ||
				(code.used_by && code.used_by.toLowerCase().includes(searchLower)) ||
				(code.comment && code.comment.toLowerCase().includes(searchLower))
			);
		}

		return true;
	});

	$: sortedCodes = [...filteredCodes].sort((a, b) => {
		let aVal = a[sortField];
		let bVal = b[sortField];

		// Handle special cases
		if (sortField === 'used_at') {
			aVal = aVal ? new Date(aVal).getTime() : 0;
			bVal = bVal ? new Date(bVal).getTime() : 0;
		}

		// Handle null/undefined values
		if (aVal === null || aVal === undefined) aVal = '';
		if (bVal === null || bVal === undefined) bVal = '';

		// Convert to strings for comparison
		aVal = String(aVal).toLowerCase();
		bVal = String(bVal).toLowerCase();

		if (sortDirection === 'asc') {
			return aVal.localeCompare(bVal);
		} else {
			return bVal.localeCompare(aVal);
		}
	});

	function sortBy(field: string) {
		if (sortField === field) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDirection = 'asc';
		}
	}

	function getSortIcon(field: string) {
		if (sortField !== field) return '↕️';
		return sortDirection === 'asc' ? '↑' : '↓';
	}

	function clearFilters() {
		statusFilter = 'all';
		givenOutFilter = 'all';
		searchTerm = '';
	}

	async function fetchCodes() {
		isLoading = true;
		message = '';
		try {
			const res = await fetch('/api/signup-codes');
			const data = await res.json();
			if (data.codes) {
				codes = data.codes;
			} else {
				message = data.error || $t('admin.signup_codes.failed_load');
				messageType = 'error';
			}
		} catch (err: any) {
			message = err.message || $t('admin.signup_codes.failed_load');
			messageType = 'error';
		} finally {
			isLoading = false;
		}
	}

	async function generateCodes() {
		if (!count || count < 1) return;
		isGenerating = true;
		message = '';
		try {
			const res = await fetch('/api/signup-codes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ count })
			});
			const data = await res.json();
			if (data.codes) {
				bulkGeneratedCodes = data.codes;
				showBulkActions = true;
				message = `Generated ${data.codes.length} code(s). You can now copy them all and mark them as given out.`;
				messageType = 'success';
				await fetchCodes();
			} else {
				message = data.error || $t('admin.signup_codes.failed_generate');
				messageType = 'error';
			}
		} catch (err: any) {
			message = err.message || $t('admin.signup_codes.failed_generate');
			messageType = 'error';
		} finally {
			isGenerating = false;
		}
	}

	function copyToClipboard(code: string) {
		navigator.clipboard.writeText(code);
		message = `Copied code: ${code}`;
		messageType = 'success';
	}

	async function markAsGivenOut(code: string, given_out: boolean, given_by?: string, comment?: string) {
		markingCode = code;
		message = '';
		try {
			const res = await fetch('/api/signup-codes', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, given_out, given_by, comment })
			});
			const data = await res.json();
			if (data.success) {
				message = `Code ${code} marked as ${given_out ? 'given out' : 'available'}.`;
				messageType = 'success';
				await fetchCodes();
			} else {
				message = data.error || $t('admin.signup_codes.failed_mark');
				messageType = 'error';
			}
		} catch (err: any) {
			message = err.message || $t('admin.signup_codes.failed_mark');
			messageType = 'error';
		} finally {
			markingCode = '';
		}
	}

	async function markBulkAsGivenOut() {
		if (!bulkGivenBy) {
			message = $t('admin.signup_codes.enter_given_by');
			messageType = 'error';
			return;
		}

		message = '';
		try {
			const promises = bulkGeneratedCodes.map((code) =>
				fetch('/api/signup-codes', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code, given_out: true, given_by: bulkGivenBy, comment: bulkComment })
				})
			);

			await Promise.all(promises);
			message = `Marked ${bulkGeneratedCodes.length} codes as given out by: ${bulkGivenBy}`;
			messageType = 'success';
			showBulkActions = false;
			bulkGeneratedCodes = [];
			bulkGivenBy = '';
			bulkComment = '';
			await fetchCodes();
		} catch (err: any) {
			message = err.message || $t('admin.signup_codes.failed_mark_bulk');
			messageType = 'error';
		}
	}

	async function deleteCode(code: string) {
		if (!confirm(`Are you sure you want to delete code "${code}"? This action cannot be undone.`)) {
			return;
		}

		message = '';
		try {
			const res = await fetch('/api/signup-codes', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code })
			});
			const data = await res.json();
			if (data.success) {
				message = `Code ${code} deleted successfully.`;
				messageType = 'success';
				await fetchCodes();
			} else {
				message = data.error || $t('admin.signup_codes.failed_delete');
				messageType = 'error';
			}
		} catch (err: any) {
			message = err.message || $t('admin.signup_codes.failed_delete');
			messageType = 'error';
		}
	}

	onMount(() => {
		fetchCodes();
	});
</script>

<svelte:head>
	<title>Signup Code Management</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="mx-auto max-w-6xl">
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold text-gray-900">{$t('admin.signup_codes.heading')}</h1>
			<p class="text-gray-600">{$t('admin.signup_codes.subheading')}</p>
		</div>

		<!-- Important Warning -->
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-5 w-5 flex-shrink-0 text-red-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<div>
					<h3 class="mb-1 text-sm font-medium text-red-900">{$t('admin.signup_codes.important_warning_title')}</h3>
					<p class="text-sm text-red-700">
						{$t('admin.signup_codes.important_warning_text')}
					</p>
				</div>
			</div>
		</div>
		<div class="mb-8 rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
			<form
				on:submit|preventDefault={generateCodes}
				class="flex flex-col items-center gap-4 md:flex-row"
			>
				<label for="count" class="block text-sm font-medium text-gray-700"
					>{$t('admin.signup_codes.count_label')}</label
				>
				<input
					id="count"
					type="number"
					min="1"
					bind:value={count}
					class="w-24 rounded-lg border border-gray-300 px-4 py-2"
				/>
				<button
					type="submit"
					class="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition-all duration-300 hover:bg-indigo-700"
					disabled={isGenerating}
				>
					{isGenerating ? $t('admin.signup_codes.generating') : $t('admin.signup_codes.generate')}
				</button>
			</form>
			{#if message}
				<div
					class="mt-4 rounded-lg p-3 {messageType === 'success'
						? 'border border-green-200 bg-green-50 text-green-800'
						: 'border border-red-200 bg-red-50 text-red-800'}"
				>
					{message}
				</div>
			{/if}
		</div>

		<!-- Bulk Actions Section -->
		{#if showBulkActions}
			<div class="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-lg">
				<h3 class="mb-4 text-lg font-semibold text-blue-900">
					{$t('admin.signup_codes.bulk_actions_title')}
				</h3>
				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<div class="mb-2 block text-sm font-medium text-blue-700"
							>{$t('admin.signup_codes.generated_codes')} ({bulkGeneratedCodes.length})</div
						>
						<div class="max-h-32 overflow-y-auto rounded-lg border border-blue-300 bg-white p-3">
							{#each bulkGeneratedCodes as code}
								<div class="font-mono text-sm text-blue-800">{code}</div>
							{/each}
						</div>
					</div>
					<div>
						<label for="bulk-given-by" class="mb-2 block text-sm font-medium text-blue-700"
							>{$t('admin.signup_codes.given_by_label')}</label
						>
						<select
							id="bulk-given-by"
							bind:value={bulkGivenBy}
							class="w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select person...</option>
							{#each givenByOptions as option}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="bulk-comment" class="mb-2 block text-sm font-medium text-blue-700">{$t('admin.signup_codes.comment')}</label>
						<input
							id="bulk-comment"
							type="text"
							bind:value={bulkComment}
							placeholder={$t('admin.signup_codes.optional_comment')}
							class="w-full rounded-lg border border-blue-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div class="flex flex-col justify-end space-y-2">
						<button
							on:click={() => {
								const codesText = bulkGeneratedCodes.join('\n');
								navigator.clipboard.writeText(codesText);
								message = $t('admin.signup_codes.all_copied');
								messageType = 'success';
							}}
							class="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
						>
							{$t('admin.signup_codes.copy_all_codes')}
						</button>
						<button
							on:click={markBulkAsGivenOut}
							class="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-700"
						>
							{$t('admin.signup_codes.mark_all_given_out')}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<div class="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
			<div class="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
				<h2 class="text-xl font-semibold text-gray-800">{$t('admin.signup_codes.all_codes')}</h2>

				<!-- Filters and Search -->
				<div class="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
					<!-- Search -->
					<input
						type="text"
						bind:value={searchTerm}
						placeholder={$t('admin.signup_codes.search_placeholder')}
						class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
					/>

					<!-- Status Filter -->
					<select
						bind:value={statusFilter}
						class="min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
					>
						<option value="all">{$t('admin.signup_codes.all_status')}</option>
						<option value="used">{$t('admin.signup_codes.used')}</option>
						<option value="unused">{$t('admin.signup_codes.unused')}</option>
					</select>

					<!-- Given Out Filter -->
					<select
						bind:value={givenOutFilter}
						class="min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
					>
						<option value="all">{$t('admin.signup_codes.all_distribution')}</option>
						<option value="given_out">{$t('admin.signup_codes.given_out')}</option>
						<option value="available">{$t('admin.signup_codes.available')}</option>
					</select>

					<!-- Clear Filters -->
					<button
						on:click={clearFilters}
						class="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
					>
						{$t('admin.signup_codes.clear_filters')}
					</button>
				</div>
			</div>

			<!-- Results Count -->
			<div class="mb-4 text-sm text-gray-600">
				Showing {sortedCodes.length} of {codes.length} codes
			</div>

			{#if isLoading}
				<div class="text-gray-500">Loading...</div>
			{:else if codes.length === 0}
				<div class="text-gray-500">No codes found.</div>
			{:else if sortedCodes.length === 0}
				<div class="text-gray-500">{$t('admin.signup_codes.no_codes_match')}</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead>
							<tr>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('code')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.code')}
										{getSortIcon('code')}
									</div>
								</th>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('used')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.status')}
										{getSortIcon('used')}
									</div>
								</th>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('given_out')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.given_out')}
										{getSortIcon('given_out')}
									</div>
								</th>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('given_by')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.given_by')}
										{getSortIcon('given_by')}
									</div>
								</th>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('used_by')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.used_by')}
										{getSortIcon('used_by')}
									</div>
								</th>
								<th
									class="cursor-pointer px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hover:bg-gray-50"
									on:click={() => sortBy('used_at')}
								>
									<div class="flex items-center gap-1">
										{$t('admin.signup_codes.used_at')}
										{getSortIcon('used_at')}
									</div>
								</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{$t('admin.signup_codes.comment')}</th>
								<th class="px-4 py-2"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100 bg-white">
							{#each sortedCodes as code}
								<tr>
									<td class="px-4 py-2">
										<div class="flex items-center gap-2">
											<span class="font-mono text-sm">{code.code}</span>
											<button
												on:click={() => copyToClipboard(code.code)}
												class="px-2 py-1 text-xs text-gray-600 transition-colors hover:text-gray-900 hover:scale-110"
												title={$t('admin.signup_codes.copy_code')}
											>
												📋
											</button>
										</div>
									</td>
									<td class="px-4 py-2">
										{#if code.used}
											<span
												class="inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
												>Used</span
											>
										{:else}
											<span
												class="inline-flex items-center justify-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
												>Unused</span
											>
										{/if}
									</td>
									<td class="px-4 py-2">
										{#if code.given_out}
											<span
												class="inline-flex items-center justify-center rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800"
												>{$t('admin.signup_codes.given_out')}</span
											>
										{:else}
											<span
												class="inline-flex items-center justify-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800"
												>{$t('admin.signup_codes.available')}</span
											>
										{/if}
									</td>
									<td class="px-4 py-2">
										{#if !code.used}
											<select
												value={code.given_by || ''}
												on:change={(e) => {
													const target = e.target as HTMLSelectElement;
													markAsGivenOut(code.code, code.given_out, target.value, code.comment);
												}}
												class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
											>
												<option value="">-</option>
												{#each givenByOptions as option}
													<option value={option}>{option}</option>
												{/each}
											</select>
										{:else}
											<span class="text-sm">{code.given_by || '-'}</span>
										{/if}
									</td>
									<td class="px-4 py-2 text-sm">{code.used_by || '-'}</td>
									<td class="px-4 py-2 text-sm"
										>{code.used_at ? new Date(code.used_at).toLocaleString() : '-'}</td
									>
									<td class="px-4 py-2">
										{#if !code.used}
											<input
												type="text"
												value={code.comment || ''}
												on:blur={(e) => {
													const target = e.target as HTMLInputElement;
													markAsGivenOut(code.code, code.given_out, code.given_by, target.value);
												}}
												placeholder={$t('admin.signup_codes.comment')}
												class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
											/>
										{:else}
											<span class="text-sm text-gray-600">{code.comment || '-'}</span>
										{/if}
									</td>
									<td class="px-4 py-2">
										<div class="flex space-x-2">
											<button
												on:click={() => deleteCode(code.code)}
												class="rounded-md bg-red-50 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-100 hover:text-red-900"
												title={$t('admin.signup_codes.delete_code')}
											>
												🗑️
											</button>
											{#if !code.used}
												{#if code.given_out}
													<button
														on:click={() => markAsGivenOut(code.code, false, code.given_by, code.comment)}
														disabled={markingCode === code.code}
														class="rounded-md bg-blue-50 px-3 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900 disabled:opacity-50"
														>{$t('admin.signup_codes.mark_available')}</button
													>
												{:else}
													<button
														on:click={() => markAsGivenOut(code.code, true, code.given_by, code.comment)}
														disabled={markingCode === code.code}
														class="rounded-md bg-orange-50 px-3 py-1 text-xs text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-900 disabled:opacity-50"
														>{$t('admin.signup_codes.mark_given_out')}</button
													>
												{/if}
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

