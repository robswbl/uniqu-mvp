// src/routes/questionnaire/[sessionId]/final/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ params, request }) {
	try {
		const { sessionId } = params;
		const body = await request.json();

		console.log('Regenerating analysis for session:', sessionId);
		console.log('Request body:', body);

		// Call your n8n webhook to regenerate the analysis
		const webhookResponse = await fetch(
			'https://manage.app.n8n.cloud/webhook/clients/uniqu-career-analysis',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					session_id: sessionId,
					action: 'regenerate',
					...body // Include any additional data from the request
				})
			}
		);

		if (!webhookResponse.ok) {
			const errorText = await webhookResponse.text();
			console.error('n8n webhook error:', webhookResponse.status, errorText);

			return json(
				{
					error: `Regeneration failed: ${webhookResponse.status} ${webhookResponse.statusText}`,
					details: errorText
				},
				{ status: webhookResponse.status }
			);
		}

		const result = await webhookResponse.json();
		console.log('n8n regeneration response:', result);

		return json({
			success: true,
			result,
			message: 'Analysis regeneration started successfully'
		});
	} catch (error) {
		console.error('Regeneration API error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
}
