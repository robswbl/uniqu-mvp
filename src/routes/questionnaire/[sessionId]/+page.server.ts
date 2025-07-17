// src/routes/questionnaire/[sessionId]/+page.server.ts
import { error, redirect, isRedirect } from '@sveltejs/kit'; // Import the 'isRedirect' helper
import { N8N_WEBHOOK_URL } from '$env/static/private';
import { supabase } from '$lib/supabaseClient';

export const actions = {
	default: async ({ params }) => {
		const sessionId = params.sessionId;
		console.log(`Server-side action triggered for session ID: ${sessionId}`);

		try {
			const { data: sessionData, error: sessionError } = await supabase
				.from('questionnaire_sessions')
				.select('user_id')
				.eq('id', sessionId)
				.single();

			if (sessionError || !sessionData) {
				throw error(404, 'Session not found.');
			}
			const userId = sessionData.user_id;

			if (!N8N_WEBHOOK_URL) {
				throw error(500, 'Server configuration error: N8N_WEBHOOK_URL not set.');
			}

			// Fire and Forget
			fetch(N8N_WEBHOOK_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: sessionId, userId: userId })
			}).catch((e) => {
				console.error('Background n8n trigger failed:', e);
			});

			// Redirect to the results page
			throw redirect(303, `/results/${sessionId}`);

		} catch (e) {
			// This is the corrected, safe error handling block
			// First, check if the error is a redirect and let it pass through
			if (isRedirect(e)) {
				throw e;
			}

			// Now, handle actual errors
			let message = 'Could not start analysis.';
			if (e instanceof Error) {
				message = e.message;
			}
			console.error('An error occurred in the server action:', e);
			throw error(500, message);
		}
	}
};