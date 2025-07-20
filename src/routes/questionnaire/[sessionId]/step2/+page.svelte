<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const sessionId = $page.params.sessionId;

	let cv_text = '';
	let saveStatus = 'Ready';
	let uploadMethod: 'paste' | 'upload' = 'paste';
	let userFirstName = '';

	function autogrow(element: HTMLTextAreaElement) {
		element.style.height = 'auto';
		const newHeight = Math.max(element.scrollHeight, 120);
		element.style.height = `${newHeight}px`;
	}

	let timeoutId: ReturnType<typeof setTimeout>;
	async function saveProgress() {
		saveStatus = 'Saving...';
		clearTimeout(timeoutId);
		timeoutId = setTimeout(async () => {
			const { error } = await supabase
				.from('questionnaire_sessions')
				.update({ cv_text })
				.eq('id', sessionId);

			if (error) {
				saveStatus = `Error: ${error.message}`;
			} else {
				saveStatus = `Saved at ${new Date().toLocaleTimeString()}`;
			}
		}, 1000);
	}

	let uploadStatus = '';
	let userId = '';
	let isDragging = false;
	let uploadProgress = 0;
	let pollingCvText = false;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
			const file = event.dataTransfer.files[0];
			const fakeEvent = { target: { files: [file] } } as unknown as Event;
			handleFileUpload(fakeEvent);
		}
	}

	let lastStep1Question = '';

	onMount(async () => {
		const { data: sessionData } = await supabase
			.from('questionnaire_sessions')
			.select('cv_text, user_id')
			.eq('id', sessionId)
			.single();

		if (sessionData?.cv_text) {
			cv_text = sessionData.cv_text;
			saveStatus = 'Loaded existing data.';
			setTimeout(() => {
				const textarea = document.getElementById('cv-textarea') as HTMLTextAreaElement;
				if (textarea) autogrow(textarea);
			}, 100);
		}
		if (sessionData?.user_id) {
			userId = sessionData.user_id;
			const { data: user } = await supabase
				.from('users')
				.select('user_firstname')
				.eq('user_uuid', sessionData.user_id)
				.single();
			if (user?.user_firstname) {
				userFirstName = user.user_firstname;
			}
		}
		const { data, error } = await supabase
			.from('question_order')
			.select('order')
			.eq('step_id', 'step1')
			.single();
		if (data && data.order && Array.isArray(data.order) && data.order.length > 0) {
			lastStep1Question = data.order[data.order.length - 1];
		} else {
			lastStep1Question = 'emotional_landscape';
		}
	});

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const allowedTypes = [
			'application/pdf'
		];
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (!allowedTypes.includes(file.type) && ext !== 'pdf') {
			alert('Please upload a PDF document (.pdf)');
			return;
		}
		if (file.size > 20 * 1024 * 1024) {
			alert('File size must be less than 20MB');
			return;
		}
		uploadStatus = 'Uploading...';
		uploadProgress = 0;
		const formData = new FormData();
		formData.append('file', file);
		formData.append('user_id', userId);
		formData.append('session_id', sessionId);
		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://manage.app.n8n.cloud/webhook/clients/uniqu-cvupload');
			xhr.upload.onprogress = (e) => {
				if (e.lengthComputable) {
					uploadProgress = Math.round((e.loaded / e.total) * 100);
				}
			};
			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					uploadStatus = 'Upload complete!';
					uploadProgress = 100;
					resolve();
				} else {
					uploadStatus = 'Upload failed.';
					uploadProgress = 0;
					reject();
				}
			};
			xhr.onerror = () => {
				uploadStatus = 'Upload failed.';
				uploadProgress = 0;
				reject();
			};
			xhr.send(formData);
		});
		pollingCvText = true;
		uploadStatus = 'Processing your CV...';
		pollForCvText();
	}

	function pollForCvText() {
		if (pollingInterval) clearInterval(pollingInterval);
		pollingInterval = setInterval(async () => {
			const { data } = await supabase
				.from('questionnaire_sessions')
				.select('cv_text')
				.eq('id', sessionId)
				.single();
			if (data?.cv_text && data.cv_text.length > 0) {
				cv_text = data.cv_text;
				pollingCvText = false;
				uploadStatus = 'CV processed!';
				if (pollingInterval) clearInterval(pollingInterval);
			}
		}, 2000);
	}

	import { onDestroy } from 'svelte';
	onDestroy(() => { if (pollingInterval) clearInterval(pollingInterval); });

	async function proceedToStep2() {
		if (!cv_text.trim()) {
			alert('Please add your CV content before proceeding.');
			return;
		}
		await saveProgress();
		await goto(`/questionnaire/${sessionId}/ikigai`);
	}

	let fromOnboarding = false;

	$: fromOnboarding = $page.url.searchParams.get('from') === 'onboarding';

	function goToBack() {
		if (fromOnboarding) {
			goto(`/questionnaire/${sessionId}/step1/${lastStep1Question}`);
		} else {
			goto(`/questionnaire/${sessionId}/step1`);
		}
	}

	function goToNext() {
		if (fromOnboarding) {
			goto(`/questionnaire/${sessionId}/step3/love?from=onboarding`);
		} else {
			goto(`/questionnaire/${sessionId}/step3`);
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<!-- Progress Header (match /step1 style) -->
	<div class="max-w-4xl mx-auto">
		<div class="flex justify-between items-center mb-6">
			<button 
				on:click={() => goto(`/dashboard/${sessionId}`)}
				class="flex items-center space-x-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
				type="button"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
				</svg>
				<span>Back to Dashboard</span>
			</button>
		</div>
		<div class="text-center mb-8">
			<div class="flex items-center justify-center space-x-2 mb-4">
				<div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
				<div class="w-16 h-0.5 bg-gray-300"></div>
				<div class="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</div>
				<div class="w-16 h-0.5 bg-gray-300"></div>
				<div class="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2">Step 2: Share Your Professional Story</h1>
			<p class="text-lg text-gray-600">Let's continue with your CV or resume. This helps us understand your background and experience.</p>
		</div>
	</div>

	<div class="max-w-4xl mx-auto p-6 md:p-8">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mb-6">
				<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
				</svg>
			</div>
			<h1 class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
				Choose How to Provide Your Background
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				You can either upload your CV as a PDF, or, if you don't have a CV, describe the most important stations of your professional life in the text field below.
			</p>
		</div>

		<!-- Method Selection -->
		<div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
			<h2 class="text-2xl font-bold text-gray-800 mb-6">How would you like to share your story?</h2>
			<div class="grid md:grid-cols-2 gap-6 mb-8">
				<button
					type="button"
					class="p-6 rounded-xl border-2 transition-all duration-200 {uploadMethod === 'paste' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}"
					on:click={() => uploadMethod = 'paste'}
				>
					<div class="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mb-4 mx-auto">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Type or Paste Text</h3>
					<p class="text-gray-600 text-sm">Describe the important points of your professional life in the box below</p>
				</button>

				<button
					type="button"
					class="p-6 rounded-xl border-2 transition-all duration-200 {uploadMethod === 'upload' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}"
					on:click={() => uploadMethod = 'upload'}
				>
					<div class="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-4 mx-auto">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Upload CV</h3>
					<p class="text-gray-600 text-sm">Upload a PDF document (.pdf)</p>
				</button>
			</div>

			<!-- Content Input -->
			{#if uploadMethod === 'paste'}
				<div class="space-y-4">
					<label for="cv-textarea" class="block text-lg font-medium text-gray-800">
						Paste your CV content here
					</label>
					<div class="relative">
						<textarea 
							id="cv-textarea"
							bind:value={cv_text} 
							on:input={saveProgress} 
							placeholder="Paste your CV or resume content here... Include your work experience, education, skills, and any other relevant information."
							class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none overflow-y-auto p-4 text-gray-700 placeholder-gray-400"
							style="height: 200px !important; max-height: 200px !important;"
						></textarea>
						{#if cv_text.length > 0}
							<div class="absolute bottom-3 right-3 text-xs text-gray-500 bg-white bg-opacity-90 px-2 py-1 rounded">
								{cv_text.length} characters
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<label for="cv-upload" class="block text-lg font-medium text-gray-800">
						Upload your CV file
					</label>
					<div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors duration-200 {isDragging ? 'border-indigo-500 bg-indigo-50' : ''}"
						on:dragover|preventDefault={() => isDragging = true}
						on:dragleave={() => isDragging = false}
						on:drop={handleDrop}
						tabindex="0"
						role="button"
						aria-label="Upload your CV file by drag and drop or click to select"
					>
						<input
							id="cv-upload"
							type="file"
							accept=".pdf"
							on:change={handleFileUpload}
							class="hidden"
						/>
						<svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
						</svg>
						<button
							type="button"
							on:click={() => document.getElementById('cv-upload')?.click()}
							class="text-indigo-600 hover:text-indigo-500 font-medium"
						>
							Choose a file
						</button>
						<p class="text-gray-500 text-sm mt-2">or drag and drop a .pdf file here (max 20MB)</p>
						{#if uploadStatus}
							<div class="mt-4 text-lg font-semibold {uploadStatus.includes('complete') || uploadStatus.includes('processed') ? 'text-green-600' : uploadStatus.includes('Processing') ? 'text-blue-600' : 'text-red-600'}">{uploadStatus}</div>
						{/if}
						{#if uploadProgress > 0 && uploadProgress < 100}
							<div class="w-full bg-gray-200 rounded-full h-3 mt-4">
								<div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300" style="width: {uploadProgress}%"></div>
							</div>
							<div class="text-xs text-gray-600 mt-1">{uploadProgress}%</div>
						{/if}
					</div>
					{#if cv_text}
						<div class="bg-gray-50 rounded-xl p-4">
							<h4 class="font-medium text-gray-800 mb-2">Your CV Content (Editable):</h4>
							<p class="text-sm text-gray-600 mb-3">The content below was extracted from your uploaded file. You can edit it if needed:</p>
							<div class="relative">
								<textarea 
									bind:value={cv_text} 
									on:input={saveProgress} 
									placeholder="Your CV content will appear here after processing..."
									class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none overflow-y-auto p-4 text-gray-700 placeholder-gray-400 bg-white"
									style="height: 200px !important; max-height: 200px !important;"
								></textarea>
								{#if cv_text.length > 0}
									<div class="absolute bottom-3 right-3 text-xs text-gray-500 bg-white bg-opacity-90 px-2 py-1 rounded border">
										{cv_text.length} characters
									</div>
								{/if}
							</div>
							<div class="mt-3 flex items-center justify-between text-xs text-gray-500">
								<span>✅ Content processed and ready to edit</span>
								<button 
									type="button"
									on:click={() => cv_text = ''}
									class="text-red-600 hover:text-red-800 underline"
								>
									Clear content
								</button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		<!-- Navigation -->
		<div class="flex justify-between mt-8">
			<button on:click={goToBack} class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
				Back
			</button>
			<button
				on:click={goToNext}
				class="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-600 transition-colors text-lg"
				disabled={!cv_text || pollingCvText}
			>
				{fromOnboarding ? 'Continue to Step 3' : 'Go to Step 3'}
			</button>
		</div>
	</div>
</div> 