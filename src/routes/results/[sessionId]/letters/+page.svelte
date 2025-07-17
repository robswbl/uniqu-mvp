<!-- /results/[sessionId]/letters/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';

	let sessionId = $page.params.sessionId;
	let motivationalLetters = [];
	let matchedCompanies = [];
	let loading = true;
	let generating = false;
	let error = null;
	let showNewLetterForm = false;
	let selectedCompany = '';
	let customCompany = '';
	let painPoints = '';
	let address = '';
	let editingNotes = {};

	// Status options for dropdown
	const statusOptions = [
		{ value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
		{ value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
		{ value: 'responded', label: 'Response Received', color: 'bg-yellow-100 text-yellow-700' },
		{ value: 'interview', label: 'Interview Scheduled', color: 'bg-green-100 text-green-700' },
		{ value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
		{ value: 'accepted', label: 'Offer Received', color: 'bg-purple-100 text-purple-700' }
	];

	function getStatusColor(status) {
		const option = statusOptions.find(opt => opt.value === status);
		return option ? option.color : 'bg-gray-100 text-gray-700';
	}

	function getStatusLabel(status) {
		const option = statusOptions.find(opt => opt.value === status);
		return option ? option.label : status;
	}

	async function fetchData() {
		try {
			loading = true;

			// Fetch motivational letters
			const { data: lettersData, error: lettersError } = await supabase
				.from('motivational_letters')
				.select('*')
				.eq('session_id', sessionId)
				.order('created_at', { ascending: false });

			if (lettersError) throw lettersError;

			// Fetch matching companies document to get company list
			const { data: companiesDoc, error: companiesError } = await supabase
				.from('generated_documents')
				.select('content_html')
				.eq('session_id', sessionId)
				.eq('document_type', 'matching_companies')
				.single();

			if (companiesError && companiesError.code !== 'PGRST116') {
				console.warn('No matching companies document found:', companiesError);
			}

			motivationalLetters = lettersData || [];
			
			// Extract company names from the companies document (simple parsing)
			if (companiesDoc?.content_html) {
				matchedCompanies = extractCompanyNames(companiesDoc.content_html);
			}

		} catch (err) {
			error = err && err.message ? err.message : 'An unknown error occurred';
			console.error('Error fetching data:', err);
		} finally {
			loading = false;
		}
	}

	function extractCompanyNames(html) {
		// Simple extraction - look for common patterns in company lists
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;
		const text = tempDiv.textContent || tempDiv.innerText || '';
		
		// Look for company names (this is a simple pattern - adjust based on your content)
		const companyPatterns = [
			/([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Corporation|Company|Ltd|Limited|AG|GmbH))/g,
			/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]*)*)/g
		];
		
		const companies = new Set();
		companyPatterns.forEach(pattern => {
			const matches = text.match(pattern);
			if (matches) {
				matches.forEach(match => {
					const cleaned = match.trim();
					if (cleaned.length > 2 && cleaned.length < 50) {
						companies.add(cleaned);
					}
				});
			}
		});
		
		return Array.from(companies).slice(0, 10); // Limit to 10 companies
	}

	async function generateLetter() {
		const companyName = selectedCompany || customCompany;
		if (!companyName.trim()) {
			alert('Please select or enter a company name');
			return;
		}

		if (!painPoints.trim()) {
			alert('Please enter key pain points for the company');
			return;
		}

		if (!address.trim()) {
			alert('Please enter the company address');
			return;
		}

		try {
			generating = true;

			// First, get the user_id from questionnaire_sessions
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('user_id')
				.eq('id', sessionId)
				.single();

			if (sessionError) {
				throw new Error('Could not find session: ' + sessionError.message);
			}

			// Create initial record with pain points and address
			const { data: newLetter, error: insertError } = await supabase
				.from('motivational_letters')
				.insert({
					session_id: sessionId,
					company_name: companyName.trim(),
					status: 'draft',
					notes: null,
					pain_points: painPoints.trim(),
					address: address.trim()
				})
				.select()
				.single();

			if (insertError) throw insertError;

			// Add to local state immediately
			motivationalLetters = [newLetter, ...motivationalLetters];
			
			// Reset form
			selectedCompany = '';
			customCompany = '';
			painPoints = '';
			address = '';
			showNewLetterForm = false;

			// Call n8n webhook to generate letter content
			try {
				console.log('Calling n8n webhook with data:', {
					user_id: sessionData.user_id,
					session_id: sessionId,
					motivational_letter_id: newLetter.id
				});

				const webhookResponse = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-motivationletter', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						user_id: sessionData.user_id,
						session_id: sessionId,
						motivational_letter_id: newLetter.id
					})
				});

				if (!webhookResponse.ok) {
					throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
				}

				const webhookResult = await webhookResponse.json();
				console.log('n8n webhook response:', webhookResult);

				alert(`Letter generation started for ${companyName}!\n\nYour motivational letter is being generated by AI. It will appear in the generated documents when ready.`);

			} catch (webhookError) {
				console.error('n8n webhook error:', webhookError);
				alert(`Letter record created for ${companyName}, but AI generation failed.\n\nError: ${webhookError.message}\n\nYou can try regenerating later.`);
			}

		} catch (err) {
			error = err && err.message ? err.message : 'Error generating letter';
			console.error('Error generating letter:', err);
			alert('Error: ' + (err.message || 'Unknown error occurred'));
		} finally {
			generating = false;
		}
	}

	async function updateStatus(letterId, newStatus) {
		try {
			const updates = {
				status: newStatus,
				updated_at: new Date().toISOString()
			};

			// Add timestamp for specific status changes
			if (newStatus === 'sent') {
				updates.sent_at = new Date().toISOString();
			} else if (newStatus === 'responded' || newStatus === 'interview' || newStatus === 'rejected' || newStatus === 'accepted') {
				updates.response_received_at = new Date().toISOString();
			}

			const { error: updateError } = await supabase
				.from('motivational_letters')
				.update(updates)
				.eq('id', letterId);

			if (updateError) throw updateError;

			// Update local state
			motivationalLetters = motivationalLetters.map(letter =>
				letter.id === letterId 
					? { ...letter, ...updates }
					: letter
			);

		} catch (err) {
			console.error('Error updating status:', err);
			alert('Error updating status');
		}
	}

	async function updateNotes(letterId, notes) {
		try {
			const { error: updateError } = await supabase
				.from('motivational_letters')
				.update({
					notes: notes.trim() || null,
					updated_at: new Date().toISOString()
				})
				.eq('id', letterId);

			if (updateError) throw updateError;

			// Update local state
			motivationalLetters = motivationalLetters.map(letter =>
				letter.id === letterId 
					? { ...letter, notes: notes.trim() || null }
					: letter
			);

			// Clear editing state
			const newEditingNotes = { ...editingNotes };
			delete newEditingNotes[letterId];
			editingNotes = newEditingNotes;

		} catch (err) {
			console.error('Error updating notes:', err);
			alert('Error updating notes');
		}
	}

	async function deleteLetter(letterId, companyName) {
		if (!confirm(`Are you sure you want to delete the letter for ${companyName}?`)) {
			return;
		}

		try {
			const { error: deleteError } = await supabase
				.from('motivational_letters')
				.delete()
				.eq('id', letterId);

			if (deleteError) throw deleteError;

			// Update local state
			motivationalLetters = motivationalLetters.filter(letter => letter.id !== letterId);

		} catch (err) {
			console.error('Error deleting letter:', err);
			alert('Error deleting letter');
		}
	}

	async function triggerWebhookForLetter(letter) {
		try {
			// Get user_id from session
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('user_id')
				.eq('id', sessionId)
				.single();

			if (sessionError) {
				throw new Error('Could not find session: ' + sessionError.message);
			}

			console.log('Testing webhook for letter:', letter.id);

			const webhookResponse = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-motivationletter', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					user_id: sessionData.user_id,
					session_id: sessionId,
					motivational_letter_id: letter.id
				})
			});

			if (!webhookResponse.ok) {
				throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
			}

			const webhookResult = await webhookResponse.json();
			console.log('Test webhook response:', webhookResult);

			alert(`✅ Webhook triggered successfully for ${letter.company_name}!\n\nCheck n8n workflow and generated documents.`);

		} catch (error) {
			console.error('Test webhook error:', error);
			alert(`❌ Webhook test failed:\n\n${error.message}`);
		}
	}

	function toggleMenu(letterId) {
		const menu = document.getElementById('menu-' + letterId);
		if (menu) {
			menu.classList.toggle('hidden');
		}
	}

	function handleStatusChange(letterId, event) {
		const newStatus = event.target.value;
		updateStatus(letterId, newStatus);
	}

	function startEditingNotes(letterId, currentNotes) {
		editingNotes = { ...editingNotes, [letterId]: currentNotes || '' };
	}

	function cancelEditingNotes(letterId) {
		const newEditingNotes = { ...editingNotes };
		delete newEditingNotes[letterId];
		editingNotes = newEditingNotes;
	}

	function saveNotes(letterId) {
		const notes = editingNotes[letterId] || '';
		updateNotes(letterId, notes);
	}

	onMount(() => {
		fetchData();
	});
</script>

<svelte:head>
	<title>Application Letters - UniqU</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="max-w-6xl mx-auto">
		
		<!-- Header -->
		<div class="mb-8">
			<button 
				on:click={() => goto(`/results/${sessionId}`)}
				class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
				type="button"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to Results
			</button>
			
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 mb-2">Application Letters</h1>
					<p class="text-gray-600">Generate and track your personalized motivational letters</p>
				</div>
				
				<button
					on:click={() => showNewLetterForm = !showNewLetterForm}
					class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
					type="button"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
					<span>Generate New Letter</span>
				</button>
			</div>
		</div>

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
				<h3 class="text-lg font-semibold text-red-800 mb-2">Error Loading Letters</h3>
				<p class="text-red-600">{error}</p>
				<button 
					on:click={fetchData}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					type="button"
				>
					Try Again
				</button>
			</div>
		{:else}
			
			<!-- New Letter Form -->
			{#if showNewLetterForm}
				<div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
					<h3 class="text-xl font-semibold text-gray-900 mb-4">Generate New Motivational Letter</h3>
					
					<div class="space-y-4">
						{#if matchedCompanies.length > 0}
							<div>
								<label for="company-select" class="block text-sm font-medium text-gray-700 mb-2">
									Select from your matched companies:
								</label>
								<select 
									id="company-select"
									bind:value={selectedCompany}
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								>
									<option value="">-- Select a company --</option>
									{#each matchedCompanies as company}
										<option value={company}>{company}</option>
									{/each}
								</select>
							</div>
							
							<div class="text-center text-gray-500 text-sm">
								OR
							</div>
						{/if}
						
						<div>
							<label for="custom-company" class="block text-sm font-medium text-gray-700 mb-2">
								Enter a different company name:
							</label>
							<input
								id="custom-company"
								type="text"
								bind:value={customCompany}
								placeholder="Enter company name..."
								class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							/>
						</div>
						
						<!-- Pain Points Field -->
						<div>
							<label for="pain-points" class="block text-sm font-medium text-gray-700 mb-2">
								<span class="text-red-500">*</span> Key pain points of the company:
							</label>
							<textarea
								id="pain-points"
								bind:value={painPoints}
								placeholder="What challenges does this company face? What problems need solving?"
								class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								rows="3"
								required
							></textarea>
							<p class="text-xs text-gray-500 mt-1">These will be used to tailor your motivational letter to address specific company needs.</p>
						</div>
						
						<!-- Address Field -->
						<div>
							<label for="address" class="block text-sm font-medium text-gray-700 mb-2">
								<span class="text-red-500">*</span> Company address:
							</label>
							<textarea
								id="address"
								bind:value={address}
								placeholder="Company Name&#10;Street Address&#10;City, Postal Code&#10;Country"
								class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								rows="3"
								required
							></textarea>
							<p class="text-xs text-gray-500 mt-1">Full company address for proper letter formatting.</p>
						</div>
						
						<div class="flex items-center space-x-4 pt-4">
							<button
								on:click={generateLetter}
								disabled={generating || (!selectedCompany && !customCompany.trim()) || !painPoints.trim() || !address.trim()}
								class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
								type="button"
							>
								{#if generating}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>Generating...</span>
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<span>Generate Letter</span>
								{/if}
							</button>
							
							<button
								on:click={() => showNewLetterForm = false}
								class="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
								type="button"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Letters List -->
			{#if motivationalLetters.length === 0}
				<div class="text-center py-12">
					<div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
						<div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">No Letters Yet</h3>
						<p class="text-gray-600 mb-6">Generate your first motivational letter to get started with your job applications.</p>
						<button 
							on:click={() => showNewLetterForm = true}
							class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium"
							type="button"
						>
							Generate First Letter
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					{#each motivationalLetters as letter, index}
						<div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
							
							<!-- Letter Header -->
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1">
									<h3 class="text-xl font-semibold text-gray-900 mb-1">{letter.company_name}</h3>
									<p class="text-sm text-gray-500">
										Created {new Date(letter.created_at).toLocaleDateString()}
										{#if letter.updated_at !== letter.created_at}
											• Updated {new Date(letter.updated_at).toLocaleDateString()}
										{/if}
									</p>
								</div>
								
								<div class="flex items-center space-x-3">
									<!-- Status Dropdown -->
									<select 
										value={letter.status}
										on:change={(e) => handleStatusChange(letter.id, e)}
										class="px-3 py-2 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-500 {getStatusColor(letter.status)}"
									>
										{#each statusOptions as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
									
									<!-- Actions Dropdown -->
									<div class="relative">
										<button 
											class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
											type="button"
											on:click={() => toggleMenu(letter.id)}
										>
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
											</svg>
										</button>
										
										<div id="menu-{letter.id}" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
											<button 
												on:click={() => triggerWebhookForLetter(letter)}
												class="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 first:rounded-t-lg font-medium"
												type="button"
											>
												🔄 Test Generate Letter
											</button>
											<button 
												on:click={() => viewLetter(letter.id)}
												class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
												type="button"
											>
												View Letter Content
											</button>
											<button 
												on:click={() => deleteLetter(letter.id, letter.company_name)}
												class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
												type="button"
											>
												Delete Letter
											</button>
										</div>
									</div>
								</div>
							</div>

							<!-- Status Timeline -->
							<div class="mb-4">
								<div class="flex items-center space-x-2 text-xs text-gray-600">
									<span>Status:</span>
									<span class="font-medium">{getStatusLabel(letter.status)}</span>
									{#if letter.sent_at}
										<span>• Sent {new Date(letter.sent_at).toLocaleDateString()}</span>
									{/if}
									{#if letter.response_received_at}
										<span>• Response {new Date(letter.response_received_at).toLocaleDateString()}</span>
									{/if}
								</div>
							</div>

							<!-- Letter Details -->
							<div class="mb-4 space-y-2">
								{#if letter.pain_points}
									<div>
										<span class="text-xs font-medium text-gray-600">Key Pain Points:</span>
										<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{letter.pain_points}</p>
									</div>
								{/if}
								{#if letter.address}
									<div>
										<span class="text-xs font-medium text-gray-600">Address:</span>
										<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded whitespace-pre-line">{letter.address}</p>
									</div>
								{/if}
							</div>

							<!-- Notes Section -->
							<div class="border-t border-gray-100 pt-4">
								<div class="flex items-start justify-between mb-2">
									<label class="text-sm font-medium text-gray-700">Notes:</label>
									{#if editingNotes[letter.id] !== undefined}
										<div class="flex items-center space-x-2">
											<button 
												on:click={() => saveNotes(letter.id)}
												class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
												type="button"
											>
												Save
											</button>
											<button 
												on:click={() => cancelEditingNotes(letter.id)}
												class="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
												type="button"
											>
												Cancel
											</button>
										</div>
									{:else}
										<button 
											on:click={() => startEditingNotes(letter.id, letter.notes)}
											class="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
											type="button"
										>
											{letter.notes ? 'Edit' : 'Add Note'}
										</button>
									{/if}
								</div>
								
								{#if editingNotes[letter.id] !== undefined}
									<textarea
										bind:value={editingNotes[letter.id]}
										placeholder="Add notes about this application..."
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
										rows="3"
									></textarea>
								{:else}
									<p class="text-sm text-gray-600 italic min-h-[1.5rem]">
										{letter.notes || 'No notes added yet.'}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>