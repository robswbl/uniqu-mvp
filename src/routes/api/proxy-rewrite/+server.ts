import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.application_letter_id || !body.target_tone || !body.target_length) {
			const missingFields = [];
			if (!body.application_letter_id) missingFields.push('application_letter_id');
			if (!body.target_tone) missingFields.push('target_tone');
			if (!body.target_length) missingFields.push('target_length');

			return json(
				{ error: `Missing required fields: ${missingFields.join(', ')}` },
				{ status: 400 }
			);
		}

		// Prepare webhook payload with all available fields
		const webhookPayload = {
			application_letter_id: body.application_letter_id,
			session_id: body.session_id,
			target_tone: body.target_tone,
			target_length: body.target_length,
			original_content: body.original_content,
			original_tone: body.original_tone,
			original_language: body.original_language,
			user_id: body.user_id || null,
			generation_id: body.generation_id || null,
			job_url: body.job_url || null,
			change_request_comment: body.change_request_comment || null
		};

		console.log('Sending rewrite webhook payload:', webhookPayload);

		// Call the n8n rewrite webhook
		const webhookResponse = await fetch(
			'https://manage.app.n8n.cloud/webhook/clients/uniqu-rewrite',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(webhookPayload)
			}
		);

		if (!webhookResponse.ok) {
			throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
		}

		const result = await webhookResponse.json();
		return json(result, { status: webhookResponse.status });
	} catch (error) {
		console.error('Rewrite webhook error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Unknown error occurred' },
			{ status: 500 }
		);
	}
};
