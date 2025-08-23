// src/routes/questionnaire/[sessionId]/final/+page.server.js
import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient.js';

export const actions = {
	default: async ({ params }) => {
		const { sessionId } = params;
		const regenerationTime = new Date().toISOString();

		try {
			// Mark session as completed AND store regeneration timestamp
			await supabase
				.from('questionnaire_sessions')
				.update({
					status: 'completed',
					completed_at: regenerationTime,
					last_regeneration: regenerationTime // Add this field
				})
				.eq('id', sessionId);

			// Get user_id for webhook
			const { data: session } = await supabase
				.from('questionnaire_sessions')
				.select('user_id')
				.eq('id', sessionId)
				.single();

			// Call webhook
			await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					user_id: session?.user_id,
					session_id: sessionId,
					action: 'regenerate'
				})
			});
		} catch (err) {
			console.error('Error:', err);
		}

		// Always redirect to waiting page (not results)
		throw redirect(302, `/results/${sessionId}/generating`);
	}
};
