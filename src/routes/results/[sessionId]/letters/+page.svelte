<!-- /results/[sessionId]/letters/+page.svelte -->
<script>
	// @ts-nocheck
	import { onMount, onDestroy } from 'svelte';
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

	// Status options for dropdown (reactive)
	$: statusOptions = [
		{ value: 'draft', label: $t('letters.status.draft'), color: 'bg-gray-100 text-gray-700' },
		{ value: 'sent', label: $t('letters.status.sent'), color: 'bg-blue-100 text-blue-700' },
		{ value: 'responded', label: $t('letters.status.responded'), color: 'bg-yellow-100 text-yellow-700' },
		{ value: 'interview', label: $t('letters.status.interview'), color: 'bg-green-100 text-green-700' },
		{ value: 'rejected', label: $t('letters.status.rejected'), color: 'bg-red-100 text-red-700' },
		{ value: 'accepted', label: $t('letters.status.accepted'), color: 'bg-purple-100 text-purple-700' }
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
			timeline.push({ 
				label: $t('letters.status.sent'), 
				date: letter.sent_at, 
				color: 'text-blue-600',
				field: 'sent_at'
			});
		}
		if (letter.response_received_at) {
			timeline.push({ 
				label: $t('letters.status.responded'), 
				date: letter.response_received_at, 
				color: 'text-yellow-600',
				field: 'response_received_at'
			});
		}
		if (letter.interview_scheduled_at) {
			timeline.push({ 
				label: $t('letters.status.interview'), 
				date: letter.interview_scheduled_at, 
				color: 'text-green-600',
				field: 'interview_scheduled_at'
			});
		}
		if (letter.offer_received_at) {
			timeline.push({ 
				label: $t('letters.status.accepted'), 
				date: letter.offer_received_at, 
				color: 'text-purple-600',
				field: 'offer_received_at'
			});
		}
		if (letter.rejected_at) {
			timeline.push({ 
				label: $t('letters.status.rejected'), 
				date: letter.rejected_at, 
				color: 'text-red-600',
				field: 'rejected_at'
			});
		}
		
		return timeline;
	}

	// Track which letters have generated documents
	let generatedLetterIds = new Set();

	// Track local creation time for new letters
	let localLetterCreatedAt = {};

	// Track which application letter boxes are collapsed
	let collapsedLetterBoxes = [];
	
	// Track if all boxes should be collapsed/expanded
	let allBoxesCollapsed = false;

	// Track which letters just finished generating for success message
	let justGenerated = {};

	// Track current letter being edited/continued
	let currentLetterId = null;

	// Track which letter is being continued (for inline address field)
	let continuingLetterId = null;

	// Track expanded pain points sections
	let expandedPainPoints = [];
	
	// Track which status dates are being edited
	let editingStatusDates = {};

	// Function to clear errors
	function clearError() {
		error = null;
	}
	
	// Function to start editing a status date
	function startEditingStatusDate(letterId, statusField, currentDate) {
		editingStatusDates[letterId] = {
			...editingStatusDates[letterId],
			[statusField]: currentDate
		};
	}
	
	// Function to save a status date
	async function saveStatusDate(letterId, statusField) {
		try {
			const newDate = editingStatusDates[letterId]?.[statusField];
			if (!newDate) return;
			
			// Update the letter in the database
			const { error } = await supabase
				.from('application_letters')
				.update({ [statusField]: newDate })
				.eq('id', letterId);
			
			if (error) throw error;
			
			// Update local state
			const letterIndex = applicationLetters.findIndex(l => l.id === letterId);
			if (letterIndex !== -1) {
				applicationLetters[letterIndex] = {
					...applicationLetters[letterIndex],
					[statusField]: newDate
				};
				applicationLetters = [...applicationLetters]; // Force reactivity
			}
			
			// Clear editing state
			if (editingStatusDates[letterId]) {
				delete editingStatusDates[letterId][statusField];
				if (Object.keys(editingStatusDates[letterId]).length === 0) {
					delete editingStatusDates[letterId];
				}
				editingStatusDates = { ...editingStatusDates }; // Force reactivity
			}
			
		} catch (err) {
			console.error('Error saving status date:', err);
			error = {
				type: 'status_date_error',
				message: 'Error saving status date',
				details: err.message || 'Failed to save status date',
				timestamp: new Date().toISOString(),
				originalError: err.message
			};
		}
	}
	
	// Function to cancel editing a status date
	function cancelEditingStatusDate(letterId, statusField) {
		if (editingStatusDates[letterId]) {
			delete editingStatusDates[letterId][statusField];
			if (Object.keys(editingStatusDates[letterId]).length === 0) {
				delete editingStatusDates[letterId];
			}
			editingStatusDates = { ...editingStatusDates }; // Force reactivity
		}
	}

	// Function to continue letter generation for letters with pain points but no content
	async function continueLetterGeneration(letter) {
		try {
					// Set the continuing letter ID to show inline address field
		continuingLetterId = letter.id;
		currentLetterId = letter.id;
		showRegenerationSection = false;
			
			// Set the form state with existing data
			address = letter.address || ''; // Use existing address if available
			
			console.log('Continuing letter generation for:', letter);
			
			// If the letter already has an address, automatically trigger generation
			if (letter.address && letter.address.trim()) {
				console.log('Letter has address, auto-triggering generation...');
				// Small delay to ensure form is rendered
				setTimeout(() => {
					generateLetter();
				}, 100);
			}
		} catch (err) {
			console.error('Error continuing letter generation:', err);
			error = {
				type: 'continue_error',
				message: 'Error continuing letter generation',
				details: err.message || 'Failed to continue letter generation',
				timestamp: new Date().toISOString(),
				originalError: err.message
			};
		}
	}

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
				.select('id, content_html, letter_content_html')
				.eq('session_id', sessionId);
			
			if (!contentCheckError && allLetters) {
				const lettersWithContent = allLetters.filter(letter => 
					letter.content_html || letter.letter_content_html
				);
				generatedLetterIds = new Set(lettersWithContent.map(letter => letter.id.toString()));
			} else {
				generatedLetterIds = new Set();
			}

			applicationLetters = lettersData || [];
			
			// Initialize collapsedLetterBoxes as empty array
			collapsedLetterBoxes = [];
			
			// Extract company names from the companies document (simple parsing)
			if (companiesDoc?.content_html) {
				matchedCompanies = extractCompanyNames(companiesDoc.content_html);
			}

			// Fetch versions for all letters
			if (applicationLetters.length > 0) {
				for (const letter of applicationLetters) {
					await fetchLetterVersions(letter.id);
				}
			}

		} catch (err) {
			console.error('Error fetching data:', err);
			error = {
				type: 'fetch_error',
				message: 'Error loading letters',
				details: err.message || 'An unknown error occurred while loading your application letters.',
				timestamp: new Date().toISOString(),
				originalError: err.message
			};
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

	async function analyzePainPoints() {
		if (!companyPortalUrl.trim()) {
			alert('Please enter a company portal URL');
			return;
		}

		if (jobsChWarning) {
			alert('Please enter a valid jobs.ch URL');
			return;
		}

		// Reset form state for new analysis
		spontaneousStep = 1;
		painPointsAnalysisComplete = false;
		analyzingPainPoints = true;
		painPoints = '';
		showRegenerationSection = false;

		try {
			analyzingPainPoints = true;

			// Get user_id from questionnaire_sessions
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('user_id, generation_id')
				.eq('id', sessionId)
				.single();

			if (sessionError) {
				throw new Error('Could not find session: ' + sessionError.message);
			}

			// Create initial application letter record
			const letterData = {
				session_id: sessionId,
				status: 'draft',
				notes: null,
				language: newLetterLanguage,
				tone: newLetterTone,
				company_name: customCompany || selectedCompany,
				pain_points: null,
				address: null,
				job_url: null
			};

			const { data: newLetter, error: insertError } = await supabase
				.from('application_letters')
				.insert(letterData)
				.select()
				.single();

			if (insertError) throw insertError;

			// Call pain points analysis webhook
			const webhookData = {
				user_id: sessionData.user_id,
				session_id: sessionId,
				application_letter_id: newLetter.id,
				generation_id: sessionData.generation_id,
				language: newLetterLanguage,
				tone: newLetterTone,
				job_portal: 'jobs.ch',
				company_portal_url: companyPortalUrl.trim(),
				company_name: customCompany || selectedCompany
			};

			console.log('Calling pain points analysis webhook with data:', webhookData);

			const webhookResponse = await fetch('/api/proxy-painpoint-analysis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(webhookData)
			});

			if (!webhookResponse.ok) {
				// Try to get detailed error information from the response
				let errorDetails = '';
				try {
					const errorResponse = await webhookResponse.json();
					if (errorResponse.details) {
						errorDetails = errorResponse.details;
					}
				} catch (parseError) {
					// If we can't parse the error response, use the status text
					errorDetails = webhookResponse.statusText;
				}
				
				throw new Error(`Pain points analysis failed: ${webhookResponse.status} ${webhookResponse.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
			}

			// Parse the response (proxy handles JSON parsing)
			const webhookResult = await webhookResponse.json();
			console.log('Pain points analysis webhook response:', webhookResult);

			// Start polling for completion
			pollForPainPointsAnalysis(newLetter.id);

		} catch (err) {
			// Enhanced error handling for workflow failures
			console.error('Error analyzing pain points:', err);
			
			// Determine the type of error and provide appropriate messaging
			let errorType = 'unknown';
			let userMessage = 'Error analyzing pain points. ';
			let errorDetails = '';
			
			if (err.message.includes('504')) {
				errorType = 'gateway_timeout';
				userMessage = 'Pain points analysis is taking longer than expected';
				errorDetails = 'The analysis process is still running but taking longer than usual. This is normal when analyzing multiple companies or complex websites.\n\n• The analysis continues in the background\n• You can check back later to see results\n• This is not an error - just a longer processing time\n\nPlease wait a few more minutes or check back later.';
			} else if (err.message.includes('500')) {
				errorType = 'workflow_failure';
				userMessage = 'Pain points analysis failed: 500 Internal Server Error';
				errorDetails = 'The workflow service encountered an internal error. This could be due to:\n\n• The company website being temporarily unavailable\n• The scraping service being overloaded\n• A configuration issue with the workflow\n\nPlease try again in a few minutes or use a different company URL.';
			} else if (err.message.includes('timeout')) {
				errorType = 'timeout';
				userMessage += 'The scraping process timed out. This can happen with complex websites. Please try again or use a different company URL.';
			} else if (err.message.includes('JSON')) {
				errorType = 'parse_error';
				userMessage += 'The webhook returned an invalid response. This may be due to a timeout in the scraping process. Please try again.';
			} else if (err.message.includes('network') || err.message.includes('fetch')) {
				errorType = 'network_error';
				userMessage += 'Network error occurred. Please check your connection and try again.';
			} else if (err.message.includes('404')) {
				errorType = 'not_found';
				userMessage = 'Company website not found or inaccessible';
				errorDetails = 'The provided URL could not be reached. Please check the URL and try again.';
			} else {
				errorType = 'unknown';
				userMessage += err.message || 'Unknown error occurred';
			}
			
			// Set the error for display in the UI
			error = {
				type: errorType,
				message: userMessage,
				details: errorDetails,
				timestamp: new Date().toISOString(),
				originalError: err.message
			};
			
			// Log detailed error information for debugging
			console.error('Detailed error info:', {
				type: errorType,
				message: userMessage,
				details: errorDetails,
				originalError: err.message,
				stack: err.stack
			});
			
			// Don't use alert for better UX - let the UI handle error display
		} finally {
			analyzingPainPoints = false;
		}
	}

	// Polling for pain points analysis completion
	function pollForPainPointsAnalysis(letterId) {
		let elapsed = 0;
		const interval = 5000; // 5 seconds (reduced polling frequency)
		const maxTime = 660000; // 11 minutes (matching proxy timeout)
		
		// Update UI to show progress
		error = {
			type: 'processing',
			message: 'Pain points analysis in progress...',
			details: 'Analyzing company websites and identifying pain points. This process can take 5-10 minutes depending on the number of companies being analyzed.\n\n• Please wait while the analysis continues\n• You can leave this page and check back later\n• Results will appear automatically when complete',
			timestamp: new Date().toISOString(),
			originalError: null
		};

		function poll() {
			setTimeout(async () => {
				try {
					const { data: letterData, error: dbError } = await supabase
						.from('application_letters')
						.select('pain_points, status')
						.eq('id', letterId)
						.single();

					if (!dbError && letterData && letterData.pain_points) {
						console.log('Pain points analysis completed for letter:', letterId, letterData);
						painPointsAnalysisComplete = true;
						spontaneousStep = 2;
						analyzingPainPoints = false;
						// Update the pain points field
						painPoints = letterData.pain_points;
						// Force UI update
						applicationLetters = [...applicationLetters];
						return;
					}

					// Check if there was an error in the analysis
					if (!dbError && letterData && letterData.status === 'error') {
						console.error('Pain points analysis failed on server side');
						error = {
							type: 'workflow_failure',
							message: 'Pain points analysis failed due to a timeout or error',
							details: 'The server-side analysis process encountered an error. This could be due to:\n\n• The company website being temporarily unavailable\n• The scraping service being overloaded\n• A configuration issue with the workflow\n\nPlease try again with a different company URL.',
							timestamp: new Date().toISOString(),
							originalError: 'Server-side analysis failed'
						};
						return;
					}

					elapsed += interval;
					
					// Update progress message with elapsed time
					if (elapsed < maxTime) {
						const minutes = Math.floor(elapsed / 60000);
						const seconds = Math.floor((elapsed % 60000) / 1000);
						const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
						
						error = {
							type: 'processing',
							message: `Pain points analysis in progress... (${timeString})`,
							details: 'Analyzing company websites and identifying pain points. This process can take 5-10 minutes depending on the number of companies being analyzed.\n\n• Please wait while the analysis continues\n• You can leave this page and check back later\n• Results will appear automatically when complete',
							timestamp: new Date().toISOString(),
							originalError: null
						};
						
						poll();
					} else {
						console.error('Pain points analysis timed out');
						error = {
							type: 'timeout',
							message: 'Pain points analysis timed out after 11 minutes',
							details: 'The analysis process took longer than expected. This may be due to:\n\n• Multiple companies being analyzed simultaneously\n• Complex website structures requiring longer processing\n• High server load on the analysis service\n\nPlease note: The analysis may still be running in the background. You can check back later or try again.',
							timestamp: new Date().toISOString(),
							originalError: 'Analysis timeout'
						};
					}
				} catch (pollError) {
					console.error('Error during polling:', pollError);
					error = {
						type: 'polling_error',
						message: 'Error checking analysis status',
						details: 'Failed to check the status of the pain points analysis. This could be due to:\n\n• Network connectivity issues\n• Database connection problems\n• Server-side errors\n\nPlease try again.',
						timestamp: new Date().toISOString(),
						originalError: pollError.message
					};
				}
			}, interval);
		}
		poll();
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
				language: newLetterLanguage,
				tone: newLetterTone
			};

			let letterId = null;
			let isContinuing = false;
			let existingLetter = null;

			if (currentLetterId) {
				// We're continuing an existing letter
				letterId = currentLetterId;
				isContinuing = true;
				
				// Get the existing letter data to use its language and tone
				const { data: letterData, error: fetchError } = await supabase
					.from('application_letters')
					.select('language, tone')
					.eq('id', letterId)
					.single();
				
				if (fetchError) throw fetchError;
				
				existingLetter = letterData;
				
				// Update the existing letter with the new data
				const updateData = {
					address: address.trim(),
					language: existingLetter.language || 'en'
				};

				const { data: updatedLetter, error: updateError } = await supabase
					.from('application_letters')
					.update(updateData)
					.eq('id', letterId)
					.select()
					.single();

				if (updateError) throw updateError;
				
				console.log('Updated existing letter for generation:', updatedLetter);
			} else {
				// Creating a new letter
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

				// Create initial record
				const { data: newLetter, error: insertError } = await supabase
					.from('application_letters')
					.insert(letterData)
					.select()
					.single();

				if (insertError) throw insertError;

				letterId = newLetter.id;
				
				// Add to local state immediately
				applicationLetters = [newLetter, ...applicationLetters];
				// Track local creation time for progress bar
				localLetterCreatedAt[newLetter.id] = Date.now();
			}

			// Capture job URL before resetting form
			const capturedJobUrl = jobUrl.trim();
			
			// Reset form (but keep continuing letter state for inline form)
			selectedCompany = '';
			customCompany = '';
			painPoints = '';
			address = '';
			jobUrl = '';
			showNewLetterForm = false;
			newLetterTone = 'professional';
			// Don't clear currentLetterId here - it will be cleared when generation completes

			// Call appropriate n8n webhook based on type
			try {
				const webhookData = {
					user_id: sessionData.user_id,
					session_id: sessionId,
					application_letter_id: letterId,
					generation_id: sessionData.generation_id,
					language: isContinuing ? (existingLetter.language || 'en') : newLetterLanguage,
					tone: isContinuing ? (existingLetter.tone || 'professional') : newLetterTone
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
				pollForGeneratedDocument(letterId);

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
				.select('content_html, letter_content_html, status, company_name')
				.eq('id', letterId)
				.single();
			
			console.log('Polling check for letter:', letterId, 'Content:', letterContent, 'Error:', contentError);
			
						if (!contentError && letterContent && (letterContent.content_html || letterContent.letter_content_html)) {
				console.log('Content detected for letter:', letterId, letterContent);
				generatedLetterIds.add(letterId.toString());
				pollingErrors[letterId] = false;
				delete localLetterCreatedAt[letterId];
				justGenerated[letterId] = true;
				
				// Update the letter in the local state with the new content
				applicationLetters = applicationLetters.map(letter =>
				  letter.id === letterId 
				    ? { ...letter, content_html: letterContent.content_html || letterContent.letter_content_html, letter_content_html: letterContent.letter_content_html, status: letterContent.status }
				    : letter
				);
				
				// Create original version when letter is first generated
				await createOriginalVersion(letterId);
				
				// Clear continuing letter state if this was the letter being continued
				if (continuingLetterId === letterId) {
				  continuingLetterId = null;
				  currentLetterId = null;
				  address = '';
				  newLetterTone = 'professional';
				}
				
				setTimeout(() => { delete justGenerated[letterId]; applicationLetters = [...applicationLetters]; }, 5000);
				return;
			}
	      
	      			// Also check if the status has changed to indicate completion
			if (!contentError && letterContent && letterContent.status === 'completed') {
				console.log('Status completed detected for letter:', letterId, letterContent);
				generatedLetterIds.add(letterId.toString());
				pollingErrors[letterId] = false;
				delete localLetterCreatedAt[letterId];
				justGenerated[letterId] = true;
				
				// Update the letter in the local state
				applicationLetters = applicationLetters.map(letter =>
				  letter.id === letterId 
				    ? { ...letter, status: letterContent.status }
				    : letter
				);
				
				// Create original version when letter is first generated
				await createOriginalVersion(letterId);
				
				setTimeout(() => { delete justGenerated[letterId]; applicationLetters = [...applicationLetters]; }, 5000);
				return;
			}
	      
	      // Check if content is stored in application_letters table (letter_content_html)
	      const { data: letterContentData, error: letterContentError } = await supabase
	        .from('application_letters')
	        .select('letter_content_html, content_html')
	        .eq('id', letterId)
	        .single();
	      
	      console.log('Checking application_letters for letter:', letterId, 'Data:', letterContentData, 'Error:', letterContentError);
	      
	      			if (!letterContentError && letterContentData && (letterContentData.letter_content_html || letterContentData.content_html)) {
				console.log('Content found in application_letters for letter:', letterId, letterContentData);
				generatedLetterIds.add(letterId.toString());
				pollingErrors[letterId] = false;
				delete localLetterCreatedAt[letterId];
				justGenerated[letterId] = true;
				
				// Update the letter in the local state with content from application_letters
				applicationLetters = applicationLetters.map(letter =>
				  letter.id === letterId 
				    ? { ...letter, letter_content_html: letterContentData.letter_content_html, content_html: letterContentData.content_html }
				    : letter
				);
				
				// Create original version when letter is first generated
				await createOriginalVersion(letterId);
				
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
				.select('content_html, letter_content_html, company_name')
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

			if (!letterData || (!letterData.content_html && !letterData.letter_content_html)) {
				alert('Letter content not yet generated or is empty.');
				return;
			}

					// Fetch versions for this letter (this will also clean up duplicates)
		await fetchLetterVersions(letterId);

		// Show in modal
		currentLetterContent = letterData.content_html || letterData.letter_content_html;
		currentLetterTitle = `Letter for ${letterData.company_name || 'Company'}`;
		
		console.log(`[Modal] Current letter versions:`, letterVersions[letterId]);
		console.log(`[Modal] Selected version:`, selectedVersion[letterId]);
			
			// Reset regeneration form
			targetTone = 'professional';
			targetLength = 100;
			changeRequestComment = '';
			showChangeRequestField = false;
			showRegenerationSection = false;
			
			console.log('Setting currentLetterId to:', letterId, 'type:', typeof letterId);
			currentLetterId = letterId;
			
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
	    const numericId = typeof letter.id === 'string' ? parseInt(letter.id, 10) : letter.id;
	    if (letter.status === 'draft' && letterProgress[numericId] === undefined) {
	      startLetterProgress(letter.id);
	    }
	  });
	}

	// Helper: Check if a letter is 'actively generating' (created < 20s ago)
	function isActivelyGenerating(letter) {
	  const numericId = typeof letter.id === 'string' ? parseInt(letter.id, 10) : letter.id;
	  let created = localLetterCreatedAt[numericId] || new Date(letter.created_at).getTime();
	  return letter.status === 'draft' && (Date.now() - created < GENERATION_TIME);
	}

	// Helper: Check if a generated document exists for this letter
	function isLetterGenerated(letter) {
	  return generatedLetterIds.has(letter.id.toString());
	}

	let showNewLetterDropdown = false;
	let dropdownRef;
	let newLetterType = null; // 'job' or 'spontaneous'
	let newLetterLanguage = 'en';
	let newLetterTone = 'professional';
	
	// LinkedIn URL validation
	let linkedinUrlWarning = '';
	
	// Two-step process for spontaneous letters
	let spontaneousStep = 1; // 1 or 2
	let companyPortalUrl = '';
	let jobsChWarning = '';
	let analyzingPainPoints = false;
	let painPointsAnalysisComplete = false;
	const availableLetterLanguages = [
	  { code: 'en', label: 'English' },
	  { code: 'de', label: 'Deutsch' },
	  { code: 'fr', label: 'Français' },
	  { code: 'it', label: 'Italiano' },
	  { code: 'es', label: 'Español' }
	];

	    const availableLetterTones = [
        { value: 'professional', label: 'Professional' },
        { value: 'inspirational', label: 'Inspirational' },
        { value: 'creative', label: 'Creative' },
        { value: 'technical', label: 'Technical' },
        { value: 'casual', label: 'Casual' },
        { value: 'childishly_funny', label: 'Childishly Funny' }
    ];

	const availableLengthPercentages = [
		{ value: 25, label: '25% - Very Short' },
		{ value: 50, label: '50% - Short' },
		{ value: 75, label: '75% - Medium-Short' },
		{ value: 100, label: '100% - Standard' },
		{ value: 125, label: '125% - Medium-Long' },
		{ value: 150, label: '150% - Long' }
	];

	// Version management
	let letterVersions = {};
	let selectedVersion = {};
	let regeneratingVersion = false;
	let showSuccessMessage = false;
	let successMessage = '';
	let targetTone = 'professional';
	let targetLength = 100;
	let changeRequestComment = '';
	let showChangeRequestField = false;
	let showRegenerationSection = false;
	let showFullChangeRequest = false;

	// Function to get language display name
	function getLanguageDisplayName(languageCode) {
		const language = availableLetterLanguages.find(lang => lang.code === languageCode);
		return language ? language.label : languageCode;
	}

	// Function to create original version when letter is first generated
	async function createOriginalVersion(letterId) {
		try {
			// First check if an original version already exists
			const { data: existingVersion, error: checkError } = await supabase
				.from('application_letter_versions')
				.select('id')
				.eq('application_letter_id', letterId)
				.eq('version_type', 'original')
				.maybeSingle();

			if (checkError) {
				console.error('Error checking for existing original version:', checkError);
				return;
			}

			// If original version already exists, don't create another one
			if (existingVersion) {
				console.log('Original version already exists for letter:', letterId);
				return;
			}

			const { data: letter } = await supabase
				.from('application_letters')
				.select('content_html, letter_content_html, tone, language')
				.eq('id', letterId)
				.single();

			if (letter && (letter.content_html || letter.letter_content_html)) {
				const originalVersion = {
					application_letter_id: letterId,
					version_type: 'original',
					tone: letter.tone || 'professional',
					language: letter.language || 'en',
					length_percentage: 100,
					content_html: letter.content_html || letter.letter_content_html,
					metadata: { created_from: 'original_generation' }
				};

				const { error } = await supabase
					.from('application_letter_versions')
					.insert(originalVersion);

				if (error) {
					console.error('Error creating original version:', error);
				} else {
					console.log('Original version created for letter:', letterId);
				}
			}
		} catch (err) {
			console.error('Error creating original version:', err);
		}
	}

	// Function to delete a letter version
	async function deleteLetterVersion(versionId, letterId) {
		if (!confirm($t('letters.delete_version_confirm'))) {
			return;
		}

		try {
			const { error: deleteError } = await supabase
				.from('application_letter_versions')
				.delete()
				.eq('id', versionId);

			if (deleteError) throw deleteError;

			// Update local state
			if (letterVersions[letterId]) {
				letterVersions[letterId] = letterVersions[letterId].filter(v => v.id !== versionId);
				
				// If we deleted the currently selected version, select the first available one
				if (selectedVersion[letterId] && selectedVersion[letterId].id === versionId) {
					selectedVersion[letterId] = letterVersions[letterId][0] || null;
					if (selectedVersion[letterId]) {
						currentLetterContent = selectedVersion[letterId].content_html;
					}
				}
			}

			// If no versions left, close modal
			if (letterVersions[letterId] && letterVersions[letterId].length === 0) {
				showLetterModal = false;
			}

		} catch (err) {
			console.error('Error deleting version:', err);
			alert('Error deleting version: ' + (err.message || 'Unknown error'));
		}
	}

	// Function to clean up duplicate original versions for a specific letter
	async function cleanupDuplicateOriginalVersions(letterId) {
		try {
			// Get all original versions for this letter
			const { data: originalVersions, error: fetchError } = await supabase
				.from('application_letter_versions')
				.select('id, created_at')
				.eq('application_letter_id', letterId)
				.eq('version_type', 'original')
				.order('created_at', { ascending: true });

			if (fetchError) {
				console.error('Error fetching original versions for cleanup:', fetchError);
				return;
			}

			// If there are multiple original versions, keep only the first one
			if (originalVersions && originalVersions.length > 1) {
				console.log(`Found ${originalVersions.length} original versions for letter ${letterId}, cleaning up duplicates`);
				
				// Keep the first (oldest) original version, delete the rest
				const versionsToDelete = originalVersions.slice(1);
				const idsToDelete = versionsToDelete.map(v => v.id);
				
				const { error: deleteError } = await supabase
					.from('application_letter_versions')
					.delete()
					.in('id', idsToDelete);

				if (deleteError) {
					console.error('Error deleting duplicate original versions:', deleteError);
				} else {
					console.log(`Successfully deleted ${versionsToDelete.length} duplicate original versions`);
				}
			}
		} catch (err) {
			console.error('Error cleaning up duplicate original versions:', err);
		}
	}

	// Function to clean up all duplicate original versions across all letters
	async function cleanupAllDuplicateOriginalVersions() {
		try {
			console.log('Starting cleanup of all duplicate original versions...');
			
			// Get all letters that have versions
			const { data: lettersWithVersions, error: fetchError } = await supabase
				.from('application_letter_versions')
				.select('application_letter_id')
				.eq('version_type', 'original');

			if (fetchError) {
				console.error('Error fetching letters with versions for cleanup:', fetchError);
				return;
			}

			// Get unique letter IDs
			const uniqueLetterIds = [...new Set(lettersWithVersions.map(v => v.application_letter_id))];
			console.log(`Found ${uniqueLetterIds.length} letters with versions to check`);

			// Clean up duplicates for each letter
			for (const letterId of uniqueLetterIds) {
				await cleanupDuplicateOriginalVersions(letterId);
			}

			console.log('Finished cleanup of all duplicate original versions');
		} catch (err) {
			console.error('Error cleaning up all duplicate original versions:', err);
		}
	}

	// Function to fetch letter versions
	async function fetchLetterVersions(letterId) {
		try {
			// First, clean up any duplicate original versions
			await cleanupDuplicateOriginalVersions(letterId);
			
			// Get any rewrite versions from application_letter_versions table
			const { data: rewriteVersions, error: versionsError } = await supabase
				.from('application_letter_versions')
				.select('*')
				.eq('application_letter_id', letterId)
				.order('created_at', { ascending: false });

			if (versionsError) {
				console.error(`[fetchLetterVersions] Error fetching versions:`, versionsError);
				return;
			}

			console.log(`[fetchLetterVersions] Raw rewrite versions from DB for letter ${letterId}:`, rewriteVersions);

			// Check if we have any versions (original or rewrite)
			if (rewriteVersions && rewriteVersions.length > 0) {
				console.log(`[fetchLetterVersions] Found ${rewriteVersions.length} versions for letter ${letterId}:`, rewriteVersions);
				
				// Check if there's already an original version in the versions
				const existingOriginal = rewriteVersions.find(v => v.version_type === 'original');
				
				if (existingOriginal) {
					// Use the existing original version from the database
					console.log(`[fetchLetterVersions] Using existing original version from database`);
					letterVersions[letterId] = rewriteVersions;
					selectedVersion[letterId] = rewriteVersions[0] || null;
				} else {
					// No original version exists, create a virtual one
					console.log(`[fetchLetterVersions] Creating virtual original version`);
					const { data: originalLetter, error: letterError } = await supabase
						.from('application_letters')
						.select('content_html, letter_content_html, tone, language')
						.eq('id', letterId)
						.single();

					if (letterError) {
						console.error(`[fetchLetterVersions] Error fetching original letter ${letterId}:`, letterError);
						return;
					}

					// Create a virtual "original" version from the main table
					const virtualOriginalVersion = {
						id: `virtual_${letterId}`, // Use a virtual ID to avoid conflicts
						application_letter_id: letterId,
						version_type: 'original',
						tone: originalLetter.tone || 'professional',
						language: originalLetter.language || 'en',
						length_percentage: 100,
						content_html: originalLetter.content_html || originalLetter.letter_content_html,
						created_at: new Date().toISOString(),
						isVirtual: true // Flag to identify this as a virtual version
					};

					// Combine virtual original with actual rewrite versions
					const allVersions = [virtualOriginalVersion, ...rewriteVersions];
					
					console.log(`[fetchLetterVersions] Found ${allVersions.length} total versions for letter ${letterId}:`, allVersions);

					letterVersions[letterId] = allVersions;
					selectedVersion[letterId] = allVersions[0] || null;
				}
			} else {
				// No versions exist, create a virtual original version
				console.log(`[fetchLetterVersions] No versions found, creating virtual original version`);
				const { data: originalLetter, error: letterError } = await supabase
					.from('application_letters')
					.select('content_html, letter_content_html, tone, language')
					.eq('id', letterId)
					.single();

				if (letterError) {
					console.error(`[fetchLetterVersions] Error fetching original letter ${letterId}:`, letterError);
					return;
				}

				// Create a virtual "original" version from the main table
				const virtualOriginalVersion = {
					id: `virtual_${letterId}`, // Use a virtual ID to avoid conflicts
					application_letter_id: letterId,
					version_type: 'original',
					tone: originalLetter.tone || 'professional',
					language: originalLetter.language || 'en',
					length_percentage: 100,
					content_html: originalLetter.content_html || originalLetter.letter_content_html,
					created_at: new Date().toISOString(),
					isVirtual: true // Flag to identify this as a virtual version
				};

				letterVersions[letterId] = [virtualOriginalVersion];
				selectedVersion[letterId] = virtualOriginalVersion;
			}

			letterVersions = { ...letterVersions };
			selectedVersion = { ...selectedVersion };

		} catch (err) {
			console.error('Error fetching letter versions:', err);
		}
	}

	// Function to regenerate letter with new tone/length
	async function regenerateLetter(letterId) {
		try {
			regeneratingVersion = true;

			console.log('regenerateLetter called with letterId:', letterId, 'type:', typeof letterId);

			// Validate letter ID
			if (!letterId || letterId === null || letterId === undefined) {
				throw new Error('Invalid letter ID provided');
			}

			// Check if letter exists in current state
			if (!applicationLetters || !Array.isArray(applicationLetters)) {
				console.error('Application letters array not available');
				throw new Error('Application letters not loaded. Please refresh the page and try again.');
			}

			const existingLetter = applicationLetters.find(l => l.id === letterId);
			if (!existingLetter) {
				console.error('Letter not found in current application letters array:', letterId);
				throw new Error('Letter not found in current session. Please refresh the page and try again.');
			}

			console.log('Attempting to regenerate letter with ID:', letterId);
			console.log('Current application letters:', applicationLetters.map(l => ({ id: l.id, company: l.company_name })));
			console.log('Session ID:', sessionId);

			// Get the original letter content and additional metadata
			const { data: letter, error: letterError } = await supabase
				.from('application_letters')
				.select('content_html, letter_content_html, tone, language, job_url')
				.eq('id', letterId)
				.single();

			if (letterError) {
				console.error('Database error fetching letter:', letterError);
				throw new Error(`Database error: ${letterError.message}`);
			}

			if (!letter) {
				console.error('Letter not found in database for ID:', letterId);
				throw new Error(`Letter with ID ${letterId} not found in database`);
			}

			console.log('Letter found:', { id: letterId, hasContent: !!(letter.content_html || letter.letter_content_html) });

			const originalContent = letter.content_html || letter.letter_content_html;
			if (!originalContent) {
				console.error('Letter has no content to regenerate:', letter);
				throw new Error('This letter has no content to regenerate. Please wait for the original letter to finish generating first.');
			}

			// Get session data for user_id and generation_id
			const { data: sessionData } = await supabase
				.from('questionnaire_sessions')
				.select('user_id, generation_id')
				.eq('id', sessionId)
				.single();

			// Call the rewrite webhook
			const webhookData = {
				application_letter_id: letterId,
				session_id: sessionId,
				target_tone: targetTone,
				target_length: targetLength,
				original_content: originalContent,
				original_tone: letter.tone || 'professional',
				original_language: letter.language || 'en',
				user_id: sessionData?.user_id || null,
				generation_id: sessionData?.generation_id || null,
				job_url: letter.job_url,
				change_request_comment: changeRequestComment.trim() || null
			};

			const response = await fetch('/api/proxy-rewrite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(webhookData)
			});

			if (!response.ok) {
				throw new Error(`Rewrite failed: ${response.status} ${response.statusText}`);
			}

			const result = await response.json();
			console.log('Rewrite webhook response:', result);

			// Start polling for the new version
			pollForRegeneratedVersion(letterId);

		} catch (err) {
			console.error('Error regenerating letter:', err);
			
			// Provide more user-friendly error messages
			let userMessage = 'Error regenerating letter: ';
			if (err.message.includes('not found')) {
				userMessage += 'The letter could not be found. Please refresh the page and try again.';
			} else if (err.message.includes('no content')) {
				userMessage += 'Please wait for the original letter to finish generating before creating variations.';
			} else if (err.message.includes('Database error')) {
				userMessage += 'Database connection issue. Please try again in a moment.';
			} else {
				userMessage += err.message || 'Unknown error occurred';
			}
			
			alert(userMessage);
		} finally {
			regeneratingVersion = false;
		}
	}

	// Function to poll for regenerated version
	function pollForRegeneratedVersion(letterId) {
		let elapsed = 0;
		const interval = 2000; // 2 seconds
		const maxTime = 60000; // 60 seconds

		function poll() {
			setTimeout(async () => {
				try {
					console.log(`[Polling] Checking for versions of letter ${letterId}...`);
					console.log(`[Polling] Query: SELECT * FROM application_letter_versions WHERE application_letter_id = ${letterId}`);
					
					const { data: versions, error } = await supabase
						.from('application_letter_versions')
						.select('*')
						.eq('application_letter_id', letterId)
						.order('created_at', { ascending: false });

					console.log(`[Polling] Found ${versions?.length || 0} versions:`, versions);
					if (error) {
						console.error(`[Polling] Database error:`, error);
					}

					if (!error && versions && versions.length > 0) {
						// Check if we have a new version (not the original)
						const newVersions = versions.filter(v => v.version_type === 'rewrite');
						console.log(`[Polling] Found ${newVersions.length} rewrite versions:`, newVersions);
						
						if (newVersions.length > 0) {
							console.log(`[Polling] New version detected! Refreshing...`);
							// Refresh versions
							await fetchLetterVersions(letterId);
							console.log(`[Polling] After refresh - letterVersions:`, letterVersions[letterId]);
							console.log(`[Polling] After refresh - selectedVersion:`, letterVersions[letterId]);
							console.log(`[Polling] Current letterVersions state:`, letterVersions);
							
							// Auto-select the newest version (first in the array after refresh)
							if (letterVersions[letterId] && letterVersions[letterId].length > 0) {
								selectedVersion[letterId] = letterVersions[letterId][0];
								selectedVersion = { ...selectedVersion };
								
								// Update the modal content if it's open
								if (currentLetterId === letterId && showLetterModal) {
									currentLetterContent = selectedVersion[letterId].content_html;
								}
							}
							
							// Close the regeneration section
							showRegenerationSection = false;
							
							// Reset regeneration form
							targetTone = 'professional';
							targetLength = 100;
							changeRequestComment = '';
							showChangeRequestField = false;
							showFullChangeRequest = false; // Reset change request display
							
							// Show success message
							successMessage = `✅ New letter version generated successfully!`;
							showSuccessMessage = true;
							setTimeout(() => {
								showSuccessMessage = false;
								successMessage = '';
							}, 5000); // Hide after 5 seconds
							
							// Stop regenerating state
							regeneratingVersion = false;
							
							return;
						}
					}

					elapsed += interval;
					if (elapsed < maxTime) {
						poll();
					} else {
						console.error('Version generation timed out');
						alert('Version generation timed out. Please check back later.');
						// Reset regenerating state on timeout
						regeneratingVersion = false;
					}
				} catch (pollError) {
					console.error('Error during version polling:', pollError);
				}
			}, interval);
		}
		poll();
	}

	// Function to parse markdown-like text (simplified and effective)
	function parseMarkdown(text) {
		if (!text) return '';
		
		// Convert **text** to <strong>text</strong>
		text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
		
		// Convert *text* to <em>text</em>
		text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
		
		// Handle ### headings
		text = text.replace(/^###\s+(.*?)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
		
		// Handle ## headings
		text = text.replace(/^##\s+(.*?)$/gm, '<h2 class="text-xl font-semibold text-gray-800 mt-6 mb-3">$1</h2>');
		
		// Handle # headings
		text = text.replace(/^#\s+(.*?)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');
		
		// Split text into paragraphs and process each
		let paragraphs = text.split(/\n\n+/);
		
		paragraphs = paragraphs.map(paragraph => {
			// Skip if it's already a heading
			if (paragraph.match(/^<h[1-3]/)) {
				return paragraph;
			}
			
			// Check if paragraph contains bullet points
			let lines = paragraph.split('\n');
			let hasBullets = lines.some(line => line.trim().match(/^[-*]\s+/));
			
			if (hasBullets) {
				// Process bullet points
				let processedLines = lines.map(line => {
					if (line.trim().match(/^[-*]\s+/)) {
						// Extract the content after the bullet
						let content = line.replace(/^[-*]\s+/, '');
						return `<li class="mb-1">${content}</li>`;
					}
					return line;
				});
				
				// Filter out empty lines and wrap in ul
				let listItems = processedLines.filter(line => line.trim().length > 0);
				if (listItems.length > 0) {
					return `<ul class="list-disc ml-6 space-y-1 mb-3">${listItems.join('')}</ul>`;
				}
			}
			
			// Regular paragraph
			return `<p class="mb-3 leading-relaxed">${paragraph}</p>`;
		});
		
		return paragraphs.join('');
	}

	// Function to format CV keywords nicely
	function formatCvKeywords(keywords) {
		if (!keywords) return '';
		
		// If it's already an array, format it nicely
		if (Array.isArray(keywords)) {
			return keywords.map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
		}
		
		// If it's a string, try to parse it as JSON
		if (typeof keywords === 'string') {
			try {
				// Handle the case where it's stored as a JSON string
				const parsed = JSON.parse(keywords);
				if (Array.isArray(parsed)) {
					return parsed.map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
				}
				return [keywords]; // If parsing fails, return as single item
			} catch (e) {
				// If it's not valid JSON, try to extract keywords from the string
				// Look for patterns like "keyword1", "keyword2", etc.
				const keywordMatches = keywords.match(/"([^"]+)"/g);
				if (keywordMatches) {
					return keywordMatches.map(match => match.replace(/"/g, '').trim()).filter(keyword => keyword.length > 0);
				}
				// If no quotes found, split by commas
				return keywords.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
			}
		}
		
		return keywords;
	}

	// Function to truncate text for preview
	function truncateText(text, maxLength = 300) {
		if (!text || text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	// Function to toggle pain points expansion
	function togglePainPointsExpansion(letterId) {
		if (expandedPainPoints.includes(letterId)) {
			expandedPainPoints = expandedPainPoints.filter(id => id !== letterId);
		} else {
			expandedPainPoints.push(letterId);
		}
		// Force reactivity by creating a new array
		expandedPainPoints = [...expandedPainPoints];
	}

	// FIXED COLLAPSE FUNCTIONS with proper Svelte reactivity
	function isLetterCollapsed(letterId) {
		return collapsedLetterBoxes.includes(String(letterId));
	}

	function toggleLetterBoxCollapse(letterId) {
		const stringId = String(letterId);
		
		if (collapsedLetterBoxes.includes(stringId)) {
			// Remove from collapsed array (expand)
			collapsedLetterBoxes = collapsedLetterBoxes.filter(id => id !== stringId);
		} else {
			// Add to collapsed array (collapse)
			collapsedLetterBoxes = [...collapsedLetterBoxes, stringId];
		}
		
		// Force Svelte reactivity
		collapsedLetterBoxes = collapsedLetterBoxes;
	}

	function collapseAllLetterBoxes() {
		collapsedLetterBoxes = applicationLetters.map(letter => String(letter.id));
		allBoxesCollapsed = true;
		
		// Force Svelte reactivity
		collapsedLetterBoxes = collapsedLetterBoxes;
	}

	function expandAllLetterBoxes() {
		collapsedLetterBoxes = [];
		allBoxesCollapsed = false;
		
		// Force Svelte reactivity
		collapsedLetterBoxes = collapsedLetterBoxes;
	}

	// Add reactive statement to ensure UI updates
	$: collapsedCount = collapsedLetterBoxes.length;

	// Function to get first two lines of text for collapsed preview
	function getFirstTwoLines(text, maxLength = 150) {
		if (!text) return '';
		
		// Remove HTML tags for preview
		const plainText = text.replace(/<[^>]*>/g, '');
		
		// Split into lines and take first two
		const lines = plainText.split('\n').filter(line => line.trim().length > 0);
		const firstTwoLines = lines.slice(0, 2).join(' ');
		
		// Truncate if too long
		if (firstTwoLines.length > maxLength) {
			return firstTwoLines.substring(0, maxLength) + '...';
		}
		
		return firstTwoLines;
	}

	// Real-time subscription for application letters
	let subscription = null;

	function openNewLetterForm(type) {
	  newLetterType = type;
	  showNewLetterForm = true;
	  showNewLetterDropdown = false;
	  
	  // Reset form state for new letter
	  if (type === 'spontaneous') {
		spontaneousStep = 1;
		painPointsAnalysisComplete = false;
		analyzingPainPoints = false;
		painPoints = '';
		companyPortalUrl = '';
		error = null;
	  }
	  
	  // Reset tone to default for new letters
	  newLetterTone = 'professional';
	  showRegenerationSection = false;
	}

	// Set up real-time subscription for application letters
	function setupRealtimeSubscription() {
		console.log('[Realtime] Setting up subscription for application letters, session:', sessionId);
		if (subscription) {
			console.log('[Realtime] Unsubscribing from previous subscription');
			subscription.unsubscribe();
		}
		subscription = supabase
			.channel('application_letters_updates')
			.on('postgres_changes', 
				{ 
					event: 'INSERT', 
					schema: 'uniqu', 
					table: 'application_letters',
					filter: `session_id=eq.${sessionId}`
				}, 
				(payload) => {
					console.log('[Realtime] Application letter event received:', payload);
					// Refresh the data when a new letter is added
					fetchData();
				}
			)
			.on('postgres_changes', 
				{ 
					event: 'UPDATE', 
					schema: 'uniqu', 
					table: 'application_letters',
					filter: `session_id=eq.${sessionId}`
				}, 
				async (payload) => {
					console.log('[Realtime] Application letter update received:', payload);
					// Update the specific letter in local state
					applicationLetters = applicationLetters.map(letter =>
						letter.id === payload.new.id 
							? { 
								...letter, 
								...payload.new,
								content_html: payload.new.content_html || payload.new.letter_content_html
							}
							: letter
					);
					
					// If content was generated, update the generatedLetterIds
					if (payload.new.content_html || payload.new.letter_content_html || payload.new.status === 'completed') {
						generatedLetterIds.add(payload.new.id.toString());
						// Remove from local creation tracking
						delete localLetterCreatedAt[payload.new.id];
						// Show success message
						justGenerated[payload.new.id] = true;
						
						// Create original version when letter is first generated
						await createOriginalVersion(payload.new.id);
						
						setTimeout(() => { 
							delete justGenerated[payload.new.id]; 
							applicationLetters = [...applicationLetters]; 
						}, 5000);
					}
					
					// Handle pain points analysis completion
					if (payload.new.pain_points && !payload.old?.pain_points) {
						console.log('[Realtime] Pain points analysis completed for letter:', payload.new.id);
						// Update the pain points field in the form
						painPoints = payload.new.pain_points;
						// Move to step 2 of the spontaneous form
						spontaneousStep = 2;
						painPointsAnalysisComplete = true;
						analyzingPainPoints = false;
					}
				}
			)
			.on('postgres_changes', 
				{ 
					event: 'INSERT', 
					schema: 'uniqu', 
					table: 'generated_documents',
					filter: `session_id=eq.${sessionId}`
				}, 
				async (payload) => {
					console.log('[Realtime] Generated document event received:', payload);
					if (payload.new.document_type === 'application_letter' && payload.new.application_letter_id) {
						// Update the corresponding application letter
						applicationLetters = applicationLetters.map(letter =>
							letter.id === payload.new.application_letter_id 
								? { ...letter, content_html: payload.new.content_html, letter_content_html: payload.new.letter_content_html }
								: letter
						);
						generatedLetterIds.add(payload.new.application_letter_id.toString());
						delete localLetterCreatedAt[payload.new.application_letter_id];
						justGenerated[payload.new.application_letter_id] = true;
						
						// Create original version when letter is first generated
						await createOriginalVersion(payload.new.application_letter_id);
						
						setTimeout(() => { 
							delete justGenerated[payload.new.application_letter_id]; 
							applicationLetters = [...applicationLetters]; 
						}, 5000);
					}
				}
			)
			.subscribe((status) => {
				console.log('[Realtime] Application letters subscription status:', status);
			});
	}

	onMount(() => {
		fetchData();
		setupRealtimeSubscription();
	});

	onDestroy(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
	});

	// LinkedIn URL validation
	$: {
	  if (newLetterType === 'job' && jobUrl.trim()) {
	    const url = jobUrl.trim();
	    if (url.includes('linkedin.com/jobs/search/')) {
	      linkedinUrlWarning = $t('letters.linkedin_url_warning');
	    } else {
	      linkedinUrlWarning = '';
	    }
	  } else {
	    linkedinUrlWarning = '';
	  }
	}

	// Jobs.ch URL validation
	$: {
	  if (newLetterType === 'spontaneous' && companyPortalUrl.trim()) {
	    const url = companyPortalUrl.trim();
	    if (!url.includes('jobs.ch/')) {
	      jobsChWarning = 'Functionality only active for jobs.ch!';
	    } else {
	      jobsChWarning = '';
	    }
	  } else {
	    jobsChWarning = '';
	  }
	}

	// Add debugging for button state
	$: {
	  if (showNewLetterForm) {
	    console.log('Form state:', {
	      newLetterType,
	      spontaneousStep,
	      painPointsAnalysisComplete,
	      analyzingPainPoints,
	      jobUrl: jobUrl.trim(),
	      generating,
	      address: address,
	      painPoints: painPoints ? painPoints.substring(0, 50) + '...' : '',
	      disabled: generating || 
	        (newLetterType === 'job' && !jobUrl.trim()) ||
	        (newLetterType === 'spontaneous' && ((!selectedCompany && !customCompany.trim()) || !painPoints.trim() || !address.trim()))
	    });
	  }
	}

	// Handle click outside dropdown
	function handleClickOutside(event) {
		if (dropdownRef && !dropdownRef.contains(event.target)) {
			showNewLetterDropdown = false;
		}
	}

	// Add click outside listener
	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
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
				<div class="relative" bind:this={dropdownRef}>
					<button
						on:click={() => showNewLetterDropdown = !showNewLetterDropdown}
						class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
						type="button"
						aria-label="{$t('letters.generate_new_letter_aria')}"
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

		<!-- Success Message -->
		{#if showSuccessMessage}
			<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
				<div class="flex items-center">
					<svg class="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					<span class="text-green-800 font-medium">{successMessage}</span>
				</div>
			</div>
		{/if}

		{#if loading}
			<div class="flex justify-center items-center h-64">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
			</div>
		{:else if error}
			{#if typeof error === 'object' && error.type === 'processing'}
				<!-- Processing/Progress Display -->
				<div class="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
					<div class="flex justify-center mb-4">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
					</div>
					<h3 class="text-lg font-semibold text-blue-800 mb-2">
						{error.message}
					</h3>
					<p class="text-blue-600 font-medium mb-3">
						{error.details}
					</p>
					<!-- Progress Bar -->
					<div class="w-full bg-blue-200 rounded-full h-2 mb-4">
						<div class="bg-blue-600 h-2 rounded-full transition-all duration-1000" style="width: 100%"></div>
					</div>
					<p class="text-sm text-blue-500">
						This process continues in the background. You can leave this page and check back later.
					</p>
				</div>
			{:else}
				<!-- Error Display -->
				<div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
					<h3 class="text-lg font-semibold text-red-800 mb-2">
						{typeof error === 'string' ? $t('letters.error_loading') : 'Error Loading Letters'}
					</h3>
					<p class="text-red-600 font-medium mb-3">
						{typeof error === 'string' ? error : error.message}
					</p>
				{#if typeof error === 'object' && error.details}
					<div class="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4 text-left">
						<pre class="whitespace-pre-wrap">{error.details}</pre>
					</div>
				{/if}
				<div class="flex justify-center space-x-3">
					<button 
						on:click={() => {
							clearError();
							fetchData();
						}}
						class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						type="button"
						aria-label="{$t('letters.try_again')}"
					>
						{$t('letters.try_again')}
					</button>
					{#if typeof error === 'object' && error.type === 'workflow_failure'}
						<button 
							on:click={clearError}
							class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
							type="button"
							aria-label="{$t('letters.clear_error')}"
						>
							{$t('letters.clear_error')}
						</button>
					{/if}
				</div>
				{#if typeof error === 'object' && error.timestamp}
					<p class="text-xs text-gray-500 mt-3">
						Error occurred at: {new Date(error.timestamp).toLocaleString()}
					</p>
				{/if}
			</div>
			{/if}
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
						
						<!-- Tone Selector -->
						<div>
							<label for="letter-tone" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('letters.letter_tone_label')}
							</label>
							<select
								id="letter-tone"
								bind:value={newLetterTone}
								class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
							>
								{#each availableLetterTones as tone}
									<option value={tone.value}>{tone.label}</option>
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
								{#if linkedinUrlWarning}
									<div class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
										<div class="flex items-start">
											<svg class="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
											</svg>
											<p class="text-sm text-red-800">{linkedinUrlWarning}</p>
										</div>
									</div>
								{/if}
							</div>
						{/if}
						
						<!-- Two-step spontaneous application form -->
						{#if newLetterType === 'spontaneous'}
							<!-- Debug info -->
							<div class="text-xs text-gray-500 mb-2">
								Debug: Step {spontaneousStep}, Pain Points Complete: {painPointsAnalysisComplete}, Address: {address ? 'Set' : 'Not set'}
							</div>
							<!-- Step 1: Company and URL -->
							{#if spontaneousStep === 1}
								<!-- Company Name Field -->
								<div>
									<label for="custom-company" class="block text-sm font-medium text-gray-700 mb-2">
										{$t('letters.enter_company_name')}
									</label>
									<input
										id="custom-company"
										type="text"
										bind:value={customCompany}
										placeholder="{$t('letters.enter_company_placeholder')}"
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
									/>
								</div>
								
								<!-- Company Portal URL Field -->
								<div>
									<label for="company-portal-url" class="block text-sm font-medium text-gray-700 mb-2">
										<span class="text-red-500">*</span> {$t('letters.company_portal_url_label')}
									</label>
									<input
										id="company-portal-url"
										type="url"
										bind:value={companyPortalUrl}
										placeholder="{$t('letters.company_portal_url_placeholder')}"
										class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
										required
									/>
									<p class="text-xs text-gray-500 mt-1">{$t('letters.company_portal_url_hint')}</p>
									{#if jobsChWarning}
										<div class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
											<div class="flex items-start">
												<svg class="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
												</svg>
												<p class="text-sm text-red-800">{jobsChWarning}</p>
											</div>
										</div>
									{/if}
								</div>
							{:else}
								<!-- Step 2: Pain Points and Address -->
								<!-- Pain Points Field (populated from analysis) -->
								<div>
									<label for="pain-points" class="block text-sm font-medium text-gray-700 mb-2">
										<span class="text-green-500">✓</span> {$t('letters.key_pain_points')}
									</label>
									<div class="border border-gray-300 rounded-lg bg-green-50 p-3">
										{#if painPoints}
											{#if expandedPainPoints.includes('form')}
												<!-- Show full content when expanded -->
												<div class="text-sm text-gray-700 prose prose-sm max-w-none">
													{@html parseMarkdown(painPoints)}
												</div>
												<button 
													on:click={() => togglePainPointsExpansion('form')}
													class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
													type="button"
													aria-label="{$t('letters.show_less')}"
												>
													{$t('letters.show_less')}
												</button>
											{:else}
												<!-- Show truncated content when collapsed -->
												<div class="text-sm text-gray-700 prose prose-sm max-w-none">
													{@html parseMarkdown(truncateText(painPoints))}
												</div>
												{#if painPoints.length > 300}
													<button 
														on:click={() => togglePainPointsExpansion('form')}
														class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
														type="button"
														aria-label="{$t('letters.show_more')}"
													>
														{$t('letters.show_more')}
													</button>
												{/if}
											{/if}
										{:else}
											<p class="text-sm text-gray-500 italic">{$t('letters.pain_points_will_appear')}</p>
										{/if}
									</div>
									<p class="text-xs text-green-600 mt-1">{$t('letters.pain_points_analyzed')}</p>
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
						{/if}
						
						<div class="flex items-center space-x-4 pt-4">
							{#if newLetterType === 'spontaneous' && spontaneousStep === 1}
								<!-- Step 1: Analyze Pain Points Button -->
								<button
									on:click={analyzePainPoints}
									disabled={analyzingPainPoints || !customCompany.trim() || !companyPortalUrl.trim() || jobsChWarning}
									class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
									aria-label="Analyze Company Pain Points"
								>
									{#if analyzingPainPoints}
										<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										<span>{$t('letters.analyzing')}</span>
									{:else}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
										</svg>
										<span>{$t('letters.analyze_company_pain_points')}</span>
									{/if}
								</button>
							{:else}
								<!-- Generate Letter Button (for job type or step 2) -->
								<button
									on:click={generateLetter}
									disabled={generating || 
										(newLetterType === 'job' && (!jobUrl.trim() || linkedinUrlWarning)) ||
										(newLetterType === 'spontaneous' && spontaneousStep === 2 && (!painPoints.trim() || !address.trim()))
									}
									class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
									type="button"
									aria-label="{$t('letters.generate_letter')}"
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
							{/if}
							
							<button
								on:click={() => {
									showNewLetterForm = false;
									spontaneousStep = 1;
									companyPortalUrl = '';
									painPointsAnalysisComplete = false;
									analyzingPainPoints = false;
									painPoints = '';
									error = null;
									currentLetterId = null;
									newLetterTone = 'professional';
									showRegenerationSection = false;
								}}
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
			<div class="container mx-auto px-4 py-6">
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
				<!-- Letter Count Display -->
				<div class="flex items-center justify-end mb-4">
					<div class="text-sm text-gray-500">
						{applicationLetters.length} application letter{applicationLetters.length !== 1 ? 's' : ''}
					</div>
				</div>
				
				<div class="space-y-6">
					{#each applicationLetters as letter, index}
						<div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
							
							<!-- Letter Header - ALWAYS VISIBLE -->
							<div class="flex items-start justify-between mb-4">
								<div class="flex-1">
									<div class="flex items-center space-x-3 mb-1">
										<h3 class="text-xl font-semibold text-gray-900">{letter.company_name}</h3>
									</div>
									{#if letter.job_title}
										<p class="text-lg font-bold text-gray-800 mb-2">{letter.job_title}</p>
									{/if}
								</div>
								
								<!-- Action Buttons Section - ALWAYS VISIBLE -->
								<div class="flex items-center space-x-4">
									<!-- Direct Action Buttons or Generating State -->
									{#if letter.status === 'draft' && !isLetterGenerated(letter)}
										{#if letter.pain_points && !letter.content_html && !letter.letter_content_html}
											<!-- Letter has pain points but no content - show Delete button only in header -->
											<div class="flex items-center space-x-2">
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
											</div>
										{:else if pollingErrors[typeof letter.id === 'string' ? parseInt(letter.id, 10) : letter.id]}
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
															style="width: {Math.round((letterProgress[typeof letter.id === 'string' ? parseInt(letter.id, 10) : letter.id] || 0) * 100)}%"
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
											
											<!-- Quick Regeneration Button -->
											{#if letter.content_html || letter.letter_content_html}
												<button 
													on:click={() => {
														currentLetterId = letter.id;
														viewLetter(letter.id);
													}}
													class="flex items-center space-x-1 p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
													type="button"
													aria-label="{$t('letters.regenerate_letter')}"
													title="{$t('letters.regenerate_letter')}"
												>
													<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													<span class="ml-1">{$t('letters.regenerate_letter')}</span>
												</button>
											{/if}
											
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

							<!-- Letter Details -->
								<div class="mb-4 space-y-2">
									{#if letter.pain_points}
										<div>
											<span class="text-xs font-medium text-gray-600">{$t('letters.key_pain_points')}</span>
											<div class="mt-1 bg-gray-50 p-3 rounded">
												{#if expandedPainPoints.includes(letter.id)}
													<!-- Show full content when expanded -->
													<div class="text-sm text-gray-700 prose prose-sm max-w-none">
														{@html parseMarkdown(letter.pain_points)}
													</div>
													<button 
														on:click={() => togglePainPointsExpansion(letter.id)}
														class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
														type="button"
														aria-label="{$t('letters.show_less')}"
													>
														{$t('letters.show_less')}
													</button>
												{:else}
													<!-- Show truncated content when collapsed -->
													<div class="text-sm text-gray-700 prose prose-sm max-w-none">
														{@html parseMarkdown(truncateText(letter.pain_points))}
													</div>
													{#if letter.pain_points.length > 300}
														<button 
															on:click={() => togglePainPointsExpansion(letter.id)}
															class="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
															type="button"
															aria-label="{$t('letters.show_more')}"
														>
															{$t('letters.show_more')}
														</button>
													{/if}
												{/if}
											</div>
											
											<!-- Continue Letter Generation Button (only for letters with pain points but no content) -->
											{#if letter.status === 'draft' && !letter.content_html && !letter.letter_content_html}
												<div class="mt-3 flex justify-center">
													<button 
														on:click={() => continueLetterGeneration(letter)}
														class="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-md border border-blue-700"
														type="button"
														aria-label="{$t('letters.continue_letter_generation')}"
														title="{$t('letters.continue_letter_generation')}"
													>
														<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
														</svg>
														<span>{letter.address && letter.address.trim() ? $t('letters.generate_letter_now') : $t('letters.continue_letter_generation')}</span>
													</button>
												</div>
											{/if}
										</div>
									{/if}
									
									<!-- Inline Address Field for Continuing Letter Generation -->
									{#if continuingLetterId === letter.id}
										<div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
											<div class="mb-3">
												<label for="inline-address-{letter.id}" class="block text-sm font-medium text-gray-700 mb-2">
													<span class="text-red-500">*</span> {$t('letters.company_recipient')}
												</label>
												<textarea
													id="inline-address-{letter.id}"
													bind:value={address}
													placeholder="{$t('letters.address_placeholder')}"
													class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
													rows="3"
													required
												></textarea>
												<p class="text-xs text-gray-500 mt-1">{$t('letters.address_hint')}</p>
											</div>
											
											<div class="flex items-center space-x-3">
												<button
													on:click={generateLetter}
													disabled={generating || !address.trim()}
													class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
													type="button"
													aria-label="{$t('letters.generate_letter')}"
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
													on:click={() => {
														continuingLetterId = null;
														currentLetterId = null;
														address = '';
														newLetterTone = 'professional';
													}}
													class="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
													type="button"
													aria-label="{$t('letters.cancel')}"
												>
													{$t('letters.cancel')}
												</button>
											</div>
										</div>
									{:else if letter.address}
										<div>
											<span class="text-xs font-medium text-gray-600">{$t('letters.address')}</span>
											<p class="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded whitespace-pre-line">{letter.address}</p>
										</div>
									{/if}
								</div>

								<!-- Additional Letter Details (only shown when expanded) -->
								<div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
									<!-- Job URL Line -->
									{#if letter.job_url}
										<div class="text-sm text-gray-600 mb-3">
											<span class="font-medium">Job URL:</span>
											<a href="{letter.job_url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline ml-2" title="{letter.job_url}">
												{letter.job_url.length > 50 ? letter.job_url.substring(0, 47) + '...' : letter.job_url}
											</a>
										</div>
									{/if}
									
									<!-- Dates Line -->
									<div class="text-sm text-gray-500 mb-3">
										<span>
											{$t('letters.created_at')}: {new Date(letter.created_at).toLocaleDateString()}
											{#if letter.updated_at !== letter.created_at}
												{$t('letters.updated_at')}: {new Date(letter.updated_at).toLocaleDateString()}
											{/if}
										</span>
									</div>
									
									<!-- Attributes Line (Language, Tone, Versions) -->
									<div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
										{#if letter.language}
											<span class="flex items-center">
												<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
												</svg>
												{getLanguageDisplayName(letter.language)}
											</span>
										{/if}
										{#if letter.tone}
											<span class="flex items-center">
												<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
												</svg>
												{letter.tone.charAt(0).toUpperCase() + letter.tone.slice(1)}
											</span>
										{/if}
										
										<!-- Version Count Indicator -->
										{#if letterVersions[letter.id] && letterVersions[letter.id].length > 1}
											<button
												on:click={() => viewLetter(letter.id)}
												class="flex items-center text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors cursor-pointer"
												type="button"
												title="Click to view letter versions"
											>
												<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
												</svg>
												{letterVersions[letter.id].length} {$t('letters.versions')}
											</button>
										{/if}
									</div>
									
									<!-- Status Section (Dropdown + Timeline) -->
									<div class="flex items-center space-x-8">
										<!-- Status Dropdown with Label -->
										<div class="flex flex-col">
											<span class="text-xs text-gray-500 mb-1 pl-4">{$t('letters.set_application_status')}</span>
											<select 
												value={letter.status}
												on:change={(e) => handleStatusChange(letter.id, e)}
												class="px-4 py-2 rounded-full text-xs font-medium border-0 focus:ring-2 focus:ring-indigo-500 min-w-[200px] {getStatusColor(letter.status)}"
												aria-label="Change letter status"
												disabled={letter.status === 'draft' && !isLetterGenerated(letter)}
											>
												{#each statusOptions as option}
													<option value={option.value}>{$t(`letters.status.${option.value}`)}</option>
												{/each}
											</select>
										</div>
										
										<!-- Status Timeline -->
										<div class="flex items-center space-x-2">
											{#if getStatusTimeline(letter).length > 0}
												<div class="flex flex-wrap items-center gap-2">
													{#each getStatusTimeline(letter) as event}
														{#if editingStatusDates[letter.id]?.[event.field] !== undefined}
															<!-- Editing state -->
															<div class="flex items-center space-x-2">
																<input
																	type="date"
																	bind:value={editingStatusDates[letter.id][event.field]}
																	class="text-xs px-2 py-1 rounded border border-gray-300 focus:ring-1 focus:ring-indigo-500"
																/>
																<button
																	on:click={() => saveStatusDate(letter.id, event.field)}
																	class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
																	type="button"
																	aria-label="Save date"
																>
																	✓
																</button>
																<button
																	on:click={() => cancelEditingStatusDate(letter.id, event.field)}
																	class="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
																	type="button"
																	aria-label="Cancel editing"
																>
																	✕
																</button>
															</div>
														{:else}
															<!-- Display state - clickable -->
															<button
																on:click={() => startEditingStatusDate(letter.id, event.field, event.date)}
																class="text-xs px-2 py-1 rounded-full bg-gray-100 {event.color} font-medium hover:bg-gray-200 transition-colors cursor-pointer"
																type="button"
																aria-label="Edit {event.label} date"
																title="Click to edit date"
															>
																{event.label} {new Date(event.date).toLocaleDateString()}
															</button>
														{/if}
													{/each}
												</div>
											{/if}
										</div>
									</div>
								</div>

								<!-- Notes Section -->
								<div class="border-t border-gray-100 pt-4 mb-6">
									<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
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
								
								<!-- CV Section - Only show when there's actual CV data -->
								{#if letter.cv_tagline || letter.cv_keywords || letter.cv_managementsummary || letter.cv_tips}
									<div class="border-t border-gray-100 pt-4">
										<h4 class="text-xl font-bold text-gray-900 mb-6 flex items-center">
											<svg class="w-6 h-6 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											{$t('letters.cv_enhancement')}
										</h4>
										
										<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
											<!-- CV Tagline -->
											{#if letter.cv_tagline}
												<div class="space-y-2">
													<div class="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 min-h-[100px] relative shadow-sm hover:shadow-md transition-shadow duration-200">
														<div class="flex items-center justify-between mb-3">
															<h5 class="text-sm font-semibold text-blue-800 flex items-center">
																<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
																</svg>
																CV Tagline
															</h5>
															<button 
																on:click={(e) => {
																	navigator.clipboard.writeText(letter.cv_tagline);
																	// Show temporary confirmation
																	const btn = e.target;
																	const originalText = btn.textContent;
																	btn.textContent = 'Copied!';
																	btn.classList.add('bg-green-600', 'hover:bg-green-700');
																	btn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
																	setTimeout(() => {
																		btn.textContent = originalText;
																		btn.classList.remove('bg-green-600', 'hover:bg-green-700');
																		btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
																	}, 2000);
																}}
																class="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm"
																type="button"
																title="Copy to clipboard"
															>
																Copy
															</button>
														</div>
														<div class="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed">
															{@html parseMarkdown(letter.cv_tagline)}
														</div>
													</div>
												</div>
											{/if}
											
											<!-- Keywords to use in CV -->
											{#if letter.cv_keywords}
												<div class="space-y-2">
													<div class="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 min-h-[100px] relative shadow-sm hover:shadow-md transition-shadow duration-200">
														<div class="flex items-center justify-between mb-3">
															<h5 class="text-sm font-semibold text-green-800 flex items-center">
																<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7.732A4 4 0 0115.732 4h1.086a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V15.732A4 4 0 0112.268 20H7.268A4 4 0 013 15.732V8.268a1 1 0 01.293-.707L6.707 4.293A1 1 0 017.414 4H8.268A4 4 0 0112 7.732z" />
																</svg>
																{$t('letters.cv_keywords')}
															</h5>
															<button 
																on:click={(e) => {
																	navigator.clipboard.writeText(letter.cv_keywords);
																	// Show temporary confirmation
																	const btn = e.target;
																	const originalText = btn.textContent;
																	btn.textContent = $t('letters.copied');
																	btn.classList.add('bg-green-600', 'hover:bg-green-700');
																	btn.classList.remove('bg-green-600', 'hover:bg-green-700');
																	setTimeout(() => {
																		btn.textContent = originalText;
																		btn.classList.remove('bg-green-600', 'hover:bg-green-700');
																	}, 2000);
																}}
																class="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm"
																type="button"
																title="Copy to clipboard"
															>
																{$t('letters.copy')}
															</button>
														</div>
														<div class="text-sm text-gray-700">
															<!-- Always use formatCvKeywords to handle both arrays and strings -->
															<div class="flex flex-wrap gap-2">
																{#each formatCvKeywords(letter.cv_keywords) as keyword}
																	<span class="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200 hover:bg-green-200 transition-colors">
																		{keyword}
																	</span>
																{/each}
															</div>
														</div>
													</div>
												</div>
											{/if}
											
											<!-- Management Summary -->
											{#if letter.cv_managementsummary}
												<div class="space-y-2 lg:col-span-2">
													<div class="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 min-h-[140px] relative shadow-sm hover:shadow-md transition-shadow duration-200">
														<div class="flex items-center justify-between mb-3">
															<h5 class="text-sm font-semibold text-purple-800 flex items-center">
																<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
																</svg>
																{$t('letters.cv_management_summary')}
															</h5>
															<button 
																on:click={(e) => {
																	navigator.clipboard.writeText(letter.cv_managementsummary);
																	// Show temporary confirmation
																	const btn = e.target;
																	const originalText = btn.textContent;
																	btn.textContent = $t('letters.copied');
																	btn.classList.add('bg-green-600', 'hover:bg-green-700');
																	btn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
																	setTimeout(() => {
																		btn.textContent = originalText;
																		btn.classList.remove('bg-green-600', 'hover:bg-green-700');
																	}, 2000);
																}}
																class="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 font-medium shadow-sm"
																type="button"
																title="Copy to clipboard"
															>
																{$t('letters.copy')}
															</button>
														</div>
														<div class="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed">
															{@html parseMarkdown(letter.cv_managementsummary)}
														</div>
													</div>
												</div>
											{/if}
											
											<!-- CV Tips -->
											{#if letter.cv_tips}
												<div class="space-y-2 lg:col-span-2">
													<div class="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4 min-h-[160px] relative shadow-sm hover:shadow-md transition-shadow duration-200">
														<div class="flex items-center justify-between mb-3">
															<h5 class="text-sm font-semibold text-orange-800 flex items-center">
																<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
																</svg>
																{$t('letters.cv_enhancement_tips')}
															</h5>
															<button 
																on:click={(e) => {
																	navigator.clipboard.writeText(letter.cv_tips);
																	// Show temporary confirmation
																	const btn = e.target;
																	const originalText = btn.textContent;
																	btn.textContent = $t('letters.copied');
																	btn.classList.add('bg-green-600', 'hover:bg-green-700');
																	btn.classList.remove('bg-orange-600', 'hover:bg-orange-700');
																	setTimeout(() => {
																		btn.textContent = originalText;
																		btn.classList.remove('bg-green-600', 'hover:bg-green-700');
																	}, 2000);
																}}
																class="text-xs px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 font-medium shadow-sm"
																type="button"
																title="Copy to clipboard"
															>
																{$t('letters.copy')}
															</button>
														</div>
														<div class="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed">
															{@html parseMarkdown(letter.cv_tips)}
														</div>
													</div>
												</div>
											{/if}
										</div>
									</div>
								{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
		{/if}
	</div>

<!-- Letter Modal -->
{#if showLetterModal}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
		on:click={() => {
			showLetterModal = false;
			showFullChangeRequest = false; // Reset to collapsed state
		}}
		on:keydown={(e) => e.key === 'Escape' && (() => {
			showLetterModal = false;
			showFullChangeRequest = false; // Reset to collapsed state
		})()}
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
					<!-- Create New Version Button (Left) -->
					{#if currentLetterId}
					<button 
						type="button" 
						class="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
						on:click={() => showRegenerationSection = !showRegenerationSection}
						aria-label="Create new version"
					>
						{$t('letters.create_new_version')}
					</button>
					{/if}
					
					<!-- Version Selector (Dropdown) -->
					{#if letterVersions[currentLetterId] && letterVersions[currentLetterId].length > 1}
						<div class="flex flex-col space-y-2">
							<select 
								bind:value={selectedVersion[currentLetterId]}
								class="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
								on:change={() => {
									if (selectedVersion[currentLetterId]) {
										currentLetterContent = selectedVersion[currentLetterId].content_html;
										showFullChangeRequest = false; // Reset to collapsed state
									}
								}}
							>
								{#each letterVersions[currentLetterId] || [] as version}
									<option value={version}>
										{version.version_type === 'original' ? $t('letters.original_version') : $t('letters.regenerated_version')} - 
										{version.tone} - {version.length_percentage}%
									</option>
								{/each}
							</select>
							
							<!-- Change Request Comment Display -->
							{#if selectedVersion[currentLetterId] && selectedVersion[currentLetterId].change_request_comment}
								{@const comment = selectedVersion[currentLetterId].change_request_comment}
								{@const isLongComment = comment.length > 100}
								{@const shortComment = comment.substring(0, 100) + '...'}
								<div class="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded border border-blue-200">
									<strong>Change Request:</strong> 
									{#if isLongComment && !showFullChangeRequest}
										{shortComment}
										<button
											on:click={() => showFullChangeRequest = true}
											class="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
											type="button"
										>
											Show more
										</button>
									{:else if isLongComment && showFullChangeRequest}
										{comment}
										<button
											on:click={() => showFullChangeRequest = false}
											class="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
											type="button"
										>
											Show less
										</button>
									{:else}
										{comment}
									{/if}
								</div>
							{/if}
						</div>
					{/if}
					
					<!-- Delete Version Button (right after dropdown) -->
					{#if selectedVersion[currentLetterId] && selectedVersion[currentLetterId].version_type !== 'original' && letterVersions[currentLetterId] && letterVersions[currentLetterId].length > 1}
						<button 
							on:click={() => deleteLetterVersion(selectedVersion[currentLetterId].id, currentLetterId)}
							class="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
							type="button"
							aria-label="Delete version"
						>
							{$t('letters.delete_version')}
						</button>
					{/if}
					
					<!-- Copy Button -->
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
					
					<!-- Download/Print PDF Button -->
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
						on:click={() => {
							showLetterModal = false;
							showFullChangeRequest = false; // Reset to collapsed state
						}}
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
				<!-- Regeneration Controls - Hidden by default -->
				{#if currentLetterId && showRegenerationSection}
				<div class="px-6 py-4 border-b border-gray-200 bg-gray-50 mb-6">
					<div>
						<h4 class="text-sm font-medium text-gray-700 mb-4">{$t('letters.create_new_version')}</h4>
						<div class="flex items-end space-x-4">
							<!-- Target Tone -->
							<div>
								<label for="target-tone" class="block text-xs text-gray-600 mb-1">{$t('letters.target_tone')}</label>
								<select
									id="target-tone"
									bind:value={targetTone}
									class="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
								>
									{#each availableLetterTones as tone}
										<option value={tone.value}>{tone.label}</option>
									{/each}
								</select>
							</div>
							
							<!-- Target Length -->
							<div>
								<label for="target-length" class="block text-xs text-gray-600 mb-1">{$t('letters.target_length')}</label>
								<select
									id="target-length"
									bind:value={targetLength}
									class="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
								>
									{#each availableLengthPercentages as length}
										<option value={length.value}>{length.label}</option>
									{/each}
								</select>
							</div>
							
							<!-- Change Request Comment Toggle -->
							{#if !showChangeRequestField}
								<button
									on:click={() => showChangeRequestField = true}
									type="button"
									class="px-3 py-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 hover:border-indigo-300 transition-colors"
								>
									{$t('letters.add_change_request')}
								</button>
							{/if}
							
							<!-- Regenerate Button -->
							<button
								on:click={() => regenerateLetter(currentLetterId)}
								disabled={regeneratingVersion || !currentLetterId}
								class="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								type="button"
								aria-label="{$t('letters.create_new_version')}"
							>
								{#if regeneratingVersion}
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									{$t('letters.generating_version')}
								{:else}
									{$t('letters.create_new_version')}
								{/if}
							</button>
						</div>
						
						<!-- Collapsible Change Request Field -->
						{#if showChangeRequestField}
							<div class="mt-4 pt-4 border-t border-gray-200">
								<div class="relative">
									<!-- Close button -->
									<button
										on:click={() => showChangeRequestField = false}
										type="button"
										class="absolute top-0 right-0 p-1 text-red-500 hover:text-red-700 transition-colors"
										aria-label="Close instructions field"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
										</svg>
									</button>
									
									<textarea
										id="change-request-comment"
										bind:value={changeRequestComment}
										placeholder="{$t('letters.change_request_comment_placeholder')}"
										class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 resize-none"
										rows="2"
										maxlength="500"
									></textarea>
									<p class="text-xs text-gray-500 mt-0.5">{$t('letters.change_request_comment_hint')}</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
				{/if}
				
				<div class="prose max-w-none">
					{@html currentLetterContent}
				</div>
			</div>
		</div>
	</div>
{/if}
</div>