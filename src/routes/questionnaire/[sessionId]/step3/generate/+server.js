import { json } from '@sveltejs/kit';

export async function POST({ params, request }) {
	try {
		const { sessionId } = params;
		const body = await request.json();

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
					...body
				})
			}
		);

		if (!webhookResponse.ok) {
			const errorText = await webhookResponse.text();
			return json(
				{
					error: `Regeneration failed: ${webhookResponse.status} ${webhookResponse.statusText}`,
					details: errorText
				},
				{ status: webhookResponse.status }
			);
		}

		const result = await webhookResponse.json();
		return json({
			success: true,
			result,
			message: 'Analysis regeneration started successfully'
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
	}
}
