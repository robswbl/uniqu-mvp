<script>
	let transcript = '';
	let recognizing = false;
	// Add this for TypeScript to recognize the global
	// @ts-ignore
	let recognition;

	function startRecognition() {
		// @ts-ignore
		if (!('webkitSpeechRecognition' in window)) {
			alert('Speech recognition not supported in this browser.');
			return;
		}
		// @ts-ignore
		recognition = new webkitSpeechRecognition();
		recognition.lang = 'de-DE'; // Changed to German
		recognition.interimResults = false;
		recognition.maxAlternatives = 1;
		recognition.onresult = (event) => {
			transcript = event.results[0][0].transcript;
		};
		recognition.onend = () => (recognizing = false);
		recognition.onerror = () => (recognizing = false);
		recognition.start();
		recognizing = true;
	}
</script>

<h1>Speech-to-Text Demo</h1>
<textarea rows="4" cols="50" bind:value={transcript} placeholder="Speak or type here..."></textarea>
<br />
<button on:click={startRecognition} disabled={recognizing}>
	🎤 {recognizing ? 'Listening...' : 'Speak'}
</button>
