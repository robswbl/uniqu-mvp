<!-- /results/[sessionId]/letters/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient.js';
	import { t } from 'svelte-i18n';

	let sessionId = $page.params.sessionId;
	let applicationLetters = [];
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
	let jobUrl = '';
	
	// Modal variables
	let showLetterModal = false;
	let currentLetterContent = '';
	let currentLetterTitle = '';

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

	function getStatusTimeline(letter) {
		const timeline = [];
		
		if (letter.sent_at) {
			timeline.push({ label: 'Sent', date: letter.sent_at, color: 'text-blue-600' });
		}
		if (letter.response_received_at) {
			timeline.push({ label: 'Response', date: letter.response_received_at, color: 'text-yellow-600' });
		}
		if (letter.interview_scheduled_at) {
			timeline.push({ label: 'Interview', date: letter.interview_scheduled_at, color: 'text-green-600' });
		}
		if (letter.offer_received_at) {
			timeline.push({ label: 'Offer', date: letter.offer_received_at, color: 'text-purple-600' });
		}
		if (letter.rejected_at) {
			timeline.push({ label: 'Rejected', date: letter.rejected_at, color: 'text-red-600' });
		}
		
		return timeline;
	}

	// Track which letters have generated documents
	let generatedLetterIds = new Set();

	// Track local creation time for new letters
	let localLetterCreatedAt = {};

	// Track which letters just finished generating for success message
	let justGenerated = {};

	async function fetchData() {
		try {
			loading = true;

			// Fetch application letters
			const { data: lettersData, error: lettersError } = await supabase
				.from('application_letters')
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
				.maybeSingle();

			if (companiesError && companiesError.code !== 'PGRST116') {
				console.warn('No matching companies document found:', companiesError);
			}

			// Check which letters have generated content
			const { data: allLetters, error: contentCheckError } = await supabase
				.from('application_letters')
				.select('id, content_html, content_text')
				.eq('session_id', sessionId);
			
			if (!contentCheckError && allLetters) {
				const lettersWithContent = allLetters.filter(letter => 
					letter.content_html || letter.content_text
				);
				generatedLetterIds = new Set(lettersWithContent.map(letter => letter.id.toString()));
			} else {
				generatedLetterIds = new Set();
			}

			applicationLetters = lettersData || [];
			
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
		if (newLetterType === 'job') {
			// Handle job opening letter
			if (!jobUrl.trim()) {
				alert('Please enter a job URL');
				return;
			}
			
			// Validate URL format
			try {
				new URL(jobUrl);
			} catch {
				alert('Please enter a valid URL');
				return;
			}
		} else if (newLetterType === 'spontaneous') {
			// Handle spontaneous application letter
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
		}

		try {
			generating = true;

			// First, get the user_id from questionnaire_sessions
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('user_id, generation_id')
				.eq('id', sessionId)
				.single();

			if (sessionError) {
				throw new Error('Could not find session: ' + sessionError.message);
			}

			let letterData = {
				session_id: sessionId,
				status: 'draft',
				notes: null,
				language: newLetterLanguage
			};

			if (newLetterType === 'job') {
				// For job opening, we need to analyze the job URL first
				letterData = {
					...letterData,
					company_name: 'Job Analysis in Progress...',
					pain_points: null,
					address: null,
					job_url: jobUrl.trim()
				};
			} else {
				// For spontaneous application
				const companyName = selectedCompany || customCompany;
				letterData = {
					...letterData,
					company_name: companyName.trim(),
					pain_points: painPoints.trim(),
					address: address.trim(),
					job_url: null
				};
			}

			// Capture job URL before resetting form
			const capturedJobUrl = jobUrl.trim();

			// Create initial record
			const { data: newLetter, error: insertError } = await supabase
				.from('application_letters')
				.insert(letterData)
				.select()
				.single();

			if (insertError) throw insertError;

			// Add to local state immediately
			applicationLetters = [newLetter, ...applicationLetters];
			// Track local creation time for progress bar
			localLetterCreatedAt[newLetter.id] = Date.now();
			
			// Reset form
			selectedCompany = '';
			customCompany = '';
			painPoints = '';
			address = '';
			jobUrl = '';
			showNewLetterForm = false;

			// Call appropriate n8n webhook based on type
			try {
				const webhookData = {
					user_id: sessionData.user_id,
					session_id: sessionId,
					application_letter_id: newLetter.id,
					generation_id: sessionData.generation_id,
					language: newLetterLanguage
				};

				let webhookUrl;
				if (newLetterType === 'job') {
					webhookUrl = '/api/proxy-job-analysis';
					webhookData.job_url = capturedJobUrl;
				} else {
					webhookUrl = '/api/proxy-applicationletter';
				}

				console.log('Calling n8n webhook with data:', webhookData);

				const webhookResponse = await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(webhookData)
				});

				if (!webhookResponse.ok) {
					throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
				}

				const webhookResult = await webhookResponse.json();
				console.log('n8n webhook response:', webhookResult);

				// Start polling for generated document
				pollForGeneratedDocument(newLetter.id);

			} catch (webhookError) {
				console.error('n8n webhook error:', webhookError);
				alert(`Letter record created, but AI generation failed.\n\nError: ${webhookError.message}\n\nYou can try regenerating later.`);
			}

		} catch (err) {
			error = err && err.message ? err.message : 'Error generating letter';
			console.error('Error generating letter:', err);
			alert('Error: ' + (err.message || 'Unknown error occurred'));
		} finally {
			generating = false;
		}
	}

	// Polling logic for generated document
	let pollingTimeouts = {};
	let pollingErrors = {};
	
	// When polling finds a generated document, set justGenerated[letterId] = true and clear after 5s
	function pollForGeneratedDocument(letterId) {
	  let elapsed = 0;
	  const interval = 2000; // 2 seconds
	  const maxTime = 60000; // 60 seconds
	  pollingErrors[letterId] = false;
	  function poll() {
	    setTimeout(async () => {
	      // First, check if the letter's company name has been updated (for job analysis)
	      const { data: letterData, error: letterError } = await supabase
	        .from('application_letters')
	        .select('company_name, job_title')
	        .eq('id', letterId)
	        .single();
	      
	      if (!letterError && letterData && letterData.company_name !== 'Job Analysis in Progress...') {
	        // Company name has been updated, refresh the letters list
	        applicationLetters = applicationLetters.map(letter =>
	          letter.id === letterId 
	            ? { ...letter, company_name: letterData.company_name, job_title: letterData.job_title }
	            : letter
	        );
	      }
	      
	      // Then check for generated content in application_letters table
	      const { data: letterContent, error: contentError } = await supabase
	        .from('application_letters')
	        .select('content_html, content_text, status, company_name')
	        .eq('id', letterId)
	        .single();
	      
	      if (!contentError && letterContent && (letterContent.content_html || letterContent.content_text)) {
	        console.log('Content detected for letter:', letterId, letterContent);
	        generatedLetterIds.add(letterId.toString());
	        pollingErrors[letterId] = false;
	        delete localLetterCreatedAt[letterId];
	        justGenerated[letterId] = true;
	        
	        // Update the letter in the local state with the new content
	        applicationLetters = applicationLetters.map(letter =>
	          letter.id === letterId 
	            ? { ...letter, content_html: letterContent.content_html, content_text: letterContent.content_text, status: letterContent.status }
	            : letter
	        );
	        
	        setTimeout(() => { delete justGenerated[letterId]; applicationLetters = [...applicationLetters]; }, 5000);
	        return;
	      }
	      elapsed += interval;
	      if (elapsed < maxTime) {
	        poll();
	      } else {
	        pollingErrors[letterId] = true;
	        delete localLetterCreatedAt[letterId];
	        applicationLetters = [...applicationLetters];
	      }
	    }, interval);
	  }
	  poll();
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
			} else if (newStatus === 'responded') {
				updates.response_received_at = new Date().toISOString();
			} else if (newStatus === 'interview') {
				updates.interview_scheduled_at = new Date().toISOString();
			} else if (newStatus === 'accepted') {
				updates.offer_received_at = new Date().toISOString();
			} else if (newStatus === 'rejected') {
				updates.rejected_at = new Date().toISOString();
			}

			const { error: updateError } = await supabase
				.from('application_letters')
				.update(updates)
				.eq('id', letterId);

			if (updateError) throw updateError;

			// Update local state
			applicationLetters = applicationLetters.map(letter =>
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
				.from('application_letters')
				.update({
					notes: notes.trim() || null,
					updated_at: new Date().toISOString()
				})
				.eq('id', letterId);

			if (updateError) throw updateError;

			// Update local state
			applicationLetters = applicationLetters.map(letter =>
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
				.from('application_letters')
				.delete()
				.eq('id', letterId);

			if (deleteError) throw deleteError;

			// Update local state
			applicationLetters = applicationLetters.filter(letter => letter.id !== letterId);

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
				.select('user_id, generation_id')
				.eq('id', sessionId)
				.single();

			if (sessionError) {
				throw new Error('Could not find session: ' + sessionError.message);
			}

			console.log('Testing webhook for letter:', letter.id);

			const webhookResponse = await fetch('/api/proxy-applicationletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: sessionData.user_id,
					session_id: sessionId,
					application_letter_id: letter.id,
					generation_id: sessionData.generation_id
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

	// Modal-based viewLetter function
	async function viewLetter(letterId) {
		try {
			console.log('Looking for letter content in application_letters table:', letterId);

			const { data: letterData, error } = await supabase
				.from('application_letters')
				.select('content_html, content_text, company_name')
				.eq('id', letterId)
				.single();

			if (error) {
				console.error('Database query error:', error);
				if (error.code === 'PGRST116') {
					alert('Letter content not yet generated. Please wait for the AI to finish processing, then try again.');
				} else {
					throw error;
				}
				return;
			}

			if (!letterData || (!letterData.content_html && !letterData.content_text)) {
				alert('Letter content not yet generated or is empty.');
				return;
			}

			// Show in modal
			currentLetterContent = letterData.content_html || letterData.content_text;
			currentLetterTitle = `Letter for ${letterData.company_name || 'Company'}`;
			showLetterModal = true;

		} catch (err) {
			console.error('Error viewing letter:', err);
			alert('Error loading letter content: ' + (err.message || 'Unknown error'));
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

	// Function to manually update letters stuck with placeholder
	async function updatePlaceholderLetter(letter) {
		if (!confirm(`Update the placeholder title for this letter? This will allow you to manually set the company name.`)) {
			return;
		}

		const newCompanyName = prompt('Enter the company name for this letter:', letter.company_name === 'Job Analysis in Progress...' ? '' : letter.company_name);
		
		if (!newCompanyName || newCompanyName.trim() === '') {
			return;
		}

		try {
			const { error: updateError } = await supabase
				.from('application_letters')
				.update({
					company_name: newCompanyName.trim(),
					updated_at: new Date().toISOString()
				})
				.eq('id', letter.id);

			if (updateError) throw updateError;

			// Update local state
			applicationLetters = applicationLetters.map(l =>
				l.id === letter.id 
					? { ...l, company_name: newCompanyName.trim() }
					: l
			);

			alert(`✅ Letter updated successfully! Company name changed to: ${newCompanyName.trim()}`);

		} catch (err) {
			console.error('Error updating letter:', err);
			alert('Error updating letter: ' + (err.message || 'Unknown error'));
		}
	}

	// Add timer state for progress bar
	import { tick } from 'svelte';

	// Track progress for each generating letter by id
	let letterProgress = {};
	const GENERATION_TIME = 60000; // 60 seconds in ms

	// Helper: Start progress bar for a letter
	function startLetterProgress(letterId) {
	  letterProgress[letterId] = 0;
	  let start = Date.now();
	  function update() {
	    const elapsed = Date.now() - start;
	    letterProgress[letterId] = Math.min(elapsed / GENERATION_TIME, 1);
	    if (letterProgress[letterId] < 1) {
	      requestAnimationFrame(update);
	    } else {
	      letterProgress[letterId] = 1;
	    }
	  }
	  update();
	}

	// Watch for new letters in 'draft' state with no generated document
	$: {
	  applicationLetters.forEach(letter => {
	    if (letter.status === 'draft' && letterProgress[letter.id] === undefined) {
	      startLetterProgress(letter.id);
	    }
	  });
	}

	// Helper: Check if a letter is 'actively generating' (created < 20s ago)
	function isActivelyGenerating(letter) {
	  let created = localLetterCreatedAt[letter.id] || new Date(letter.created_at).getTime();
	  return letter.status === 'draft' && (Date.now() - created < GENERATION_TIME);
	}

	// Helper: Check if a generated document exists for this letter
	function isLetterGenerated(letter) {
	  return generatedLetterIds.has(letter.id.toString());
	}

	let showNewLetterDropdown = false;
	let newLetterType = null; // 'job' or 'spontaneous'
	let newLetterLanguage = 'en';
	const availableLetterLanguages = [
	  { code: 'en', label: 'English' },
	  { code: 'de', label: 'Deutsch' },
	  { code: 'fr', label: 'Français' },
	  { code: 'it', label: 'Italiano' },
	  { code: 'es', label: 'Español' }
	];

	function openNewLetterForm(type) {
	  newLetterType = type;
	  showNewLetterForm = true;
	  showNewLetterDropdown = false;
	}

	onMount(() => {
		fetchData();
	});

	// Add debugging for button state
	$: {
	  if (showNewLetterForm) {
	    console.log('Form state:', {
	      newLetterType,
	      jobUrl: jobUrl.trim(),
	      generating,
	      disabled: generating || 
	        (newLetterType === 'job' && !jobUrl.trim()) ||
	        (newLetterType === 'spontaneous' && ((!selectedCompany && !customCompany.trim()) || !painPoints.trim() || !address.trim()))
	    });
	  }
	}
</script>

<svelte:head>
	<title>{$t('letters.title')} - {$t('app.title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
	<div class="max-w-6xl mx-auto">
		
		<!-- Header -->
		<div class="mb-8">
			<button 
				on:click={() => goto(`/results/${sessionId}`)}
				class="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors duration-200 mb-4"
				type="button"
				aria-label="Back to Results"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				{$t('letters.back_to_results')}
			</button>
			
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900 mb-2">{$t('letters.heading')}</h1>
					<p class="text-gray-600">{$t('letters.subheading')}</p>
				</div>
				<div class="relative">
					<button
						on:click={() => showNewLetterDropdown = !showNewLetterDropdown}
						class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
						type="button"
						aria-label="Generate New Letter"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						<span>{$t('letters.generate_new_letter')}</span>
						<svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					{#if showNewLetterDropdown}
						<div class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
							<button
								class="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
								type="button"
								on:click={() => openNewLetterForm('job')}
							>
								{$t('letters.generate_based_on_job_opening')}
							</button>
							<button
								class="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
								type="button"
								on:click={() => openNewLetterForm('spontaneous')}
							>
								{$t('letters.generate_spontaneous_application')}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
				<h3 class="text-lg font-semibold text-red-800 mb-2">{$t('letters.error_loading')}</h3>
				<p class="text-red-600">{error}</p>
				<button 
					on:click={fetchData}
					class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					type="button"
					aria-label="Try Again"
				>
					{$t('letters.try_again')}
				</button>
			</div>
		{:else}
			
			<!-- New Letter Form -->
			{#if showNewLetterForm}
				<div class="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
					<h3 class="text-xl font-semibold text-gray-900 mb-4">
						{#if newLetterType === 'job'}
							{$t('letters.generate_new_application_letter_job')}
						{:else if newLetterType === 'spontaneous'}
							{$t('letters.generate_new_application_letter_spontaneous')}
						{:else}
							{$t('letters.generate_new_application_letter')}
						{/if}
					</h3>
					<div class="space-y-4">
						<!-- Language Selector -->
						<div>
							<label for="letter-language" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('letters.letter_language_label')}
							</label>
							<select
								id="letter-language"
								bind:value={newLetterLanguage}
								class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								{#each availableLetterLanguages as lang}
									<option value={lang.code}>{lang.label}</option>
								{/each}
							</select>
						</div>
						
						<!-- Job URL Field (only for job opening type) -->
						{#if newLetterType === 'job'}
							<div>
								<label for="job-url" class="block text-sm font-medium text-gray-700 mb-2">
									<span class="text-red-500">*</span> {$t('letters.job_url_label')}
								</label>
								<input
									id="job-url"
									type="url"
									bind:value={jobUrl}
									placeholder="{$t('letters.job_url_placeholder')}"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									required
								/>
								<p class="text-xs text-gray-500 mt-1">{$t('letters.job_url_hint')}</p>
							</div>
						{/if}
						
						<!-- Existing company selection fields (only for spontaneous type) -->
						{#if newLetterType === 'spontaneous'}
							{#if matchedCompanies.length > 0}
								<div>
									<label for="company-select" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('letters.select_matched_company')}
									</label>
									<select 
										id="company-select"
										bind:value={selectedCompany}
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									>
										<option value="">-- {$t('letters.select_company_placeholder')} --</option>
										{#each matchedCompanies as company}
											<option value={company}>{company}</option>
										{/each}
									</select>
								</div>
								
								<div class="text-center text-gray-500 text-sm">
									{$t('letters.or')}
								</div>
							{/if}
							
							<div>
								<label for="custom-company" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('letters.enter_different_company')}
								</label>
								<input
									id="custom-company"
									type="text"
									bind:value={customCompany}
									placeholder="{$t('letters.enter_company_placeholder')}"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
								/>
							</div>
							
							<!-- Pain Points Field -->
							<div>
								<label for="pain-points" class="block text-sm font-medium text-gray-700 mb-2">
									<span class="text-red-500">*</span> {$t('letters.key_pain_points')}
								</label>
								<textarea
									id="pain-points"
									bind:value={painPoints}
									placeholder="{$t('letters.pain_points_placeholder')}"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									rows="3"
									required
								></textarea>
								<p class="text-xs text-gray-500 mt-1">{$t('letters.pain_points_hint')}</p>
							</div>
							
							<!-- Address Field -->
							<div>
								<label for="address" class="block text-sm font-medium text-gray-700 mb-2">
									<span class="text-red-500">*</span> {$t('letters.company_address')}
								</label>
								<textarea
									id="address"
									bind:value={address}
									placeholder="{$t('letters.address_placeholder')}"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									rows="3"
									required
								></textarea>
								<p class="text-xs text-gray-500 mt-1">{$t('letters.address_hint')}</p>
							</div>
						{/if}
						
						<div class="flex items-center space-x-4 pt-4">
							<button
								on:click={generateLetter}
								disabled={generating || 
									(newLetterType === 'job' && !jobUrl.trim()) ||
									(newLetterType === 'spontaneous' && ((!selectedCompany && !customCompany.trim()) || !painPoints.trim() || !address.trim()))
								}
								class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
								type="button"
								aria-label="Generate Letter"
							>
								{#if generating}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									<span>{$t('letters.generating')}</span>
								{:else}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<span>{$t('letters.generate_letter')}</span>
								{/if}
							</button>
							
							<button
								on:click={() => showNewLetterForm = false}
								class="px-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
								type="button"
								aria-label="Cancel"
							>
								{$t('letters.cancel')}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Letters List -->
			{#if applicationLetters.length === 0}
				<div class="text-center py-12">
					<div class="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
						<div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
						</div>
						<h3 class="text-xl font-semibold text-gray-900 mb-2">{$t('letters.no_letters_yet')}</h3>
						<p class="text-gray-600 mb-6">{$t('letters.no_letters_desc')}</p>
						<button 
							on:click={() => showNewLetterForm = true}
							class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium"
							type="button"
							aria-label="Generate First Letter"
						>
							{$t('letters.generate_first_letter')}
						</button>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					{#each applicationLetters as letter, index}
						<div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
							
							<!-- Letter Header -->
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1">
									<h3 class="text-xl font-semibold text-gray-900 mb-1">{letter.company_name}</h3>
									{#if letter.job_title}
										<p class="text-lg font-bold text-gray-800 mb-2">{letter.job_title}</p>
									{/if}
									<p class="text-sm text-gray-500">
										{$t('letters.created_at')}: {new Date(letter.created_at).toLocaleDateString()}
										{#if letter.updated_at !== letter.created_at}
											{$t('letters.updated_at')}: {new Date(letter.updated_at).toLocaleDateString()}
										{/if}
									</p>
								</div>
								
								<div class="flex items-center space-x-3">
									<!-- Status Dropdown -->
									<select 
										value={letter.status}
										on:change={(e) => handleStatusChange(letter.id, e)}
										class="px-3 py-2 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-500 {getStatusColor(letter.status)}"
										aria-label="Change letter status"
										disabled={letter.status === 'draft' && !isLetterGenerated(letter)}
									>
										{#each statusOptions as option}
											<option value={option.value}>{$t(`letters.status.${option.value}`)}</option>
										{/each}
									</select>
									
									<!-- Direct Action Buttons or Generating State -->
									{#if letter.status === 'draft' && !isLetterGenerated(letter)}
										{#if pollingErrors[letter.id]}
											<div class="flex flex-col items-end min-w-[180px]">
												<div class="flex items-center space-x-2 mb-1">
													<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
														<path class="opacity-50" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
													<span class="text-red-500 font-medium">{$t('letters.generation_failed')}</span>
												</div>
												<div class="w-40 bg-gray-200 rounded-full h-2">
													<div 
														class="bg-gradient-to-r from-red-300 to-red-400 h-2 rounded-full"
														style="width: 100%"
													></div>
												</div>
												<div class="text-xs text-red-400 mt-1">{$t('letters.try_again_or_contact_support')}</div>
											</div>
										{:else}
											{#if isActivelyGenerating(letter)}
												<div class="flex flex-col items-end min-w-[180px]">
													<div class="flex items-center space-x-2 mb-1">
														<svg class="animate-spin w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														<span class="text-indigo-700 font-medium">{$t('letters.generating')}</span>
													</div>
													<div class="w-40 bg-gray-200 rounded-full h-2">
														<div 
															class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-200"
															style="width: {Math.round((letterProgress[letter.id] || 0) * 100)}%"
														></div>
													</div>
													<div class="text-xs text-gray-500 mt-1">{$t('letters.estimate_time')}</div>
												</div>
											{:else}
												<div class="flex flex-col items-end min-w-[180px]">
													<div class="flex items-center space-x-2 mb-1">
														<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-50" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
														<span class="text-gray-500 font-medium">{$t('letters.still_generating')}</span>
													</div>
													<div class="w-40 bg-gray-200 rounded-full h-2">
														<div 
															class="bg-gradient-to-r from-gray-300 to-gray-400 h-2 rounded-full"
															style="width: 100%"
														></div>
													</div>
													<div class="text-xs text-gray-400 mt-1">{$t('letters.taking_longer')}</div>
												</div>
											{/if}
										{/if}
									{:else}
										<div class="flex items-center space-x-2">
											<!-- View Letter Button -->
											<button 
												on:click={() => viewLetter(letter.id)}
												class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-base shadow-md border border-green-700"
												type="button"
												aria-label="View this letter"
												title="View this letter"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
												</svg>
												<span>{$t('letters.view_this_letter')}</span>
											</button>
											<!-- Delete Button -->
											<button 
												on:click={() => deleteLetter(letter.id, letter.company_name)}
												class="flex items-center space-x-1 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
												type="button"
												aria-label="Delete letter"
												title="Delete Letter"
											>
												<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
												<span class="ml-1">{$t('buttons.delete')}</span>
											</button>
											
											<!-- Update Placeholder Button (only show for job letters with placeholder) -->
											{#if letter.company_name === 'Job Analysis in Progress...' && letter.job_url}
												<button 
													on:click={() => updatePlaceholderLetter(letter)}
													class="flex items-center space-x-1 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
													type="button"
													aria-label="Update company name"
													title="Update Company Name"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
													</svg>
													<span class="ml-1">{$t('letters.update_company_name')}</span>
												</button>
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<!-- Status Timeline -->
							<div class="mb-4">
								<div class="flex items-center space-x-2 text-xs text-gray-600">
									<span>{$t('letters.status_label')}:</span>
									<span class="font-medium">{getStatusLabel(letter.status)}</span>
								</div>
								{#if getStatusTimeline(letter).length > 0}
									<div class="flex flex-wrap items-center gap-2 mt-2">
										{#each getStatusTimeline(letter) as event}
											<span class="text-xs px-2 py-1 rounded-full bg-gray-100 {event.color} font-medium">
												{event.label} {new Date(event.date).toLocaleDateString()}
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Letter Details -->
							<div class="mb-4 space-y-2">
								{#if letter.job_url}
									<div>
										<span class="text-xs font-medium text-gray-600">Job URL:</span>
										<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded break-all">
											<a href="{letter.job_url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline" title="{letter.job_url}">
												{letter.job_url.length > 50 ? letter.job_url.substring(0, 47) + '...' : letter.job_url}
											</a>
										</p>
									</div>
								{/if}
								{#if letter.pain_points}
									<div>
										<span class="text-xs font-medium text-gray-600">{$t('letters.key_pain_points')}</span>
										<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{letter.pain_points}</p>
									</div>
								{/if}
								{#if letter.address}
									<div>
										<span class="text-xs font-medium text-gray-600">{$t('letters.address')}</span>
										<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded whitespace-pre-line">{letter.address}</p>
									</div>
								{/if}
							</div>

							<!-- Notes Section -->
							<div class="border-t border-gray-100 pt-4">
								<div class="flex items-start justify-between mb-2">
									<label for="notes-{letter.id}" class="text-sm font-medium text-gray-700">{$t('letters.notes')}</label>
									{#if editingNotes[letter.id] !== undefined}
										<div class="flex items-center space-x-2">
											<button 
												on:click={() => saveNotes(letter.id)}
												class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
												type="button"
												aria-label="Save notes"
											>
												{$t('letters.save')}
											</button>
											<button 
												on:click={() => cancelEditingNotes(letter.id)}
												class="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
												type="button"
												aria-label="Cancel editing notes"
											>
												{$t('letters.cancel')}
											</button>
										</div>
									{:else}
										<button 
											on:click={() => startEditingNotes(letter.id, letter.notes)}
											class="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
											type="button"
											aria-label={letter.notes ? $t('letters.edit_notes') : $t('letters.add_note')}
										>
											{letter.notes ? $t('letters.edit') : $t('letters.add_note')}
										</button>
									{/if}
								</div>
								
								{#if editingNotes[letter.id] !== undefined}
									<textarea
										id="notes-{letter.id}"
										bind:value={editingNotes[letter.id]}
										placeholder="{$t('letters.notes_placeholder')}"
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
										rows="3"
										aria-label="Letter notes"
									></textarea>
								{:else}
									<p class="text-sm text-gray-600 italic min-h-[1.5rem]">
										{letter.notes || $t('letters.no_notes_added')}
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

<!-- Letter Modal -->
{#if showLetterModal}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		on:click={() => showLetterModal = false}
		on:keydown={(e) => e.key === 'Escape' && (showLetterModal = false)}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="0"
	>
		<div 
			class="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden" 
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="document"
		>
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<h3 id="modal-title" class="text-lg font-semibold text-gray-900">{$t('letters.modal_title')}</h3>
				<div class="flex items-center space-x-2">
					<button 
						on:click={() => {
							// Copy plain text from HTML
							const tempDiv = document.createElement('div');
							tempDiv.innerHTML = currentLetterContent;
							const text = tempDiv.innerText || tempDiv.textContent || '';
							navigator.clipboard.writeText(text);
						}}
						class="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
						type="button"
						aria-label="Copy letter"
					>
						{$t('letters.copy')}
					</button>
					{#if currentLetterContent && currentLetterContent.includes('pdf_url')}
						<!-- If pdf_url is present in content, extract and use it -->
						{#await (async () => { try { const match = currentLetterContent.match(/pdf_url\s*[:=]\s*['"]([^'"]+)/); return match ? match[1] : null; } catch { return null; } })() then pdfUrl}
							{#if pdfUrl}
								<a href={pdfUrl} target="_blank" rel="noopener" class="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors" aria-label="Download PDF">{$t('letters.download_pdf')}</a>
							{/if}
						{/await}
					{:else}
						<button 
							on:click={() => {
								const printWindow = window.open('', '_blank');
								printWindow.document.write(`
									<!DOCTYPE html>
									<html><head><title>${currentLetterTitle}</title>
									<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;}@media print{body{margin:0;padding:15px;}}</style>
									</head><body>${currentLetterContent}</body></html>
								`);
								printWindow.document.close();
								printWindow.print();
							}}
							class="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
							type="button"
							aria-label="Download as PDF"
						>
							{$t('letters.download_pdf')}
						</button>
					{/if}
					<button 
						on:click={() => showLetterModal = false}
						class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
						type="button"
						aria-label="Close modal"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
			<div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
				<div class="prose max-w-none">
					{@html currentLetterContent}
				</div>
			</div>
		</div>
	</div>
{/if}