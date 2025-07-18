<script lang="ts">
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	const sessionId = $page.params.sessionId;

	let cv_text = '';
	let saveStatus = 'Ready';
	let uploadMethod: 'paste' | 'upload' = 'paste';

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

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file) {
			if (file.type === 'text/plain') {
				const text = await file.text();
				cv_text = text;
				autogrow(document.getElementById('cv-textarea') as HTMLTextAreaElement);
				saveProgress();
			} else {
				alert('Please upload a text file (.txt) or paste your CV content directly.');
			}
		}
	}

	async function proceedToStep2() {
		if (!cv_text.trim()) {
			alert('Please add your CV content before proceeding.');
			return;
		}
		
		// Save current progress
		await saveProgress();
		
		// Navigate to step 2
		await goto(`/questionnaire/${sessionId}/ikigai`);
	}

	onMount(async () => {
		const { data } = await supabase
			.from('questionnaire_sessions')
			.select('cv_text')
			.eq('id', sessionId)
			.single();

		if (data?.cv_text) {
			cv_text = data.cv_text;
			saveStatus = 'Loaded existing data.';
			
			setTimeout(() => {
				const textarea = document.getElementById('cv-textarea') as HTMLTextAreaElement;
				if (textarea) autogrow(textarea);
			}, 100);
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
	<!-- Progress Bar -->
	<div class="bg-white shadow-sm">
		<div class="max-w-4xl mx-auto p-4">
			<div class="flex items-center justify-between text-sm text-gray-600 mb-2">
				<span>Step 1 of 3</span>
				<span class="text-xs bg-gray-100 px-2 py-1 rounded">{saveStatus}</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full w-1/3 transition-all duration-300"></div>
			</div>
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
				Share Your Professional Story
			</h1>
			<p class="text-xl text-gray-600 max-w-2xl mx-auto">
				Let's start with your CV or resume. This helps us understand your background and experience.
			</p>
		</div>

		<!-- Method Selection -->
		<div class="bg-white rounded-2xl shadow-lg p-8 mb-8">
			<h2 class="text-2xl font-bold text-gray-800 mb-6">How would you like to share your CV?</h2>
			
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
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Paste Text</h3>
					<p class="text-gray-600 text-sm">Copy and paste your CV content directly</p>
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
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Upload File</h3>
					<p class="text-gray-600 text-sm">Upload a text file (.txt) of your CV</p>
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
							on:input={(e) => { autogrow(e.currentTarget); saveProgress(); }} 
							rows="10" 
							placeholder="Paste your CV or resume content here... Include your work experience, education, skills, and any other relevant information."
							class="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none overflow-hidden min-h-[200px] p-4 text-gray-700 placeholder-gray-400"
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
					<div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors duration-200">
						<input
							id="cv-upload"
							type="file"
							accept=".txt"
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
						<p class="text-gray-500 text-sm mt-2">or drag and drop a .txt file here</p>
					</div>

					{#if cv_text}
						<div class="bg-gray-50 rounded-xl p-4">
							<h4 class="font-medium text-gray-800 mb-2">Preview:</h4>
							<div class="text-sm text-gray-600 max-h-32 overflow-y-auto">
								{cv_text.substring(0, 500)}{cv_text.length > 500 ? '...' : ''}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Navigation -->
		<div class="flex justify-between items-center">
			<a 
				href="/questionnaire/{sessionId}" 
				class="text-gray-600 hover:text-gray-800 font-medium flex items-center"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
				Back
			</a>

			<button
				type="button"
				on:click={proceedToStep2}
				class="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center"
			>
				Continue to Ikigai Questions
				<svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
				</svg>
			</button>
		</div>
	</div>
</div>