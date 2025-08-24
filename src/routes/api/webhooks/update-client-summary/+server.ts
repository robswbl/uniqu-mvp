import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { summary_id, status, summary_content, summary_html, pdf_url, metadata } = body;

		if (!summary_id) {
			return json({ error: 'summary_id is required' }, { status: 400 });
		}

		// Update the client summary
		const updateData: any = {
			status,
			updated_at: new Date().toISOString()
		};

		if (summary_content) updateData.summary_content = summary_content;
		if (summary_html) updateData.summary_html = summary_html;
		if (pdf_url) updateData.pdf_url = pdf_url;
		if (metadata) updateData.metadata = metadata;

		// Set generated_at timestamp when status is completed
		if (status === 'completed') {
			updateData.generated_at = new Date().toISOString();
		}

		const { data, error } = await supabase
			.from('client_summaries')
			.update(updateData)
			.eq('id', summary_id)
			.select()
			.single();

		if (error) {
			console.error('Error updating client summary:', error);
			return json({ error: 'Failed to update summary' }, { status: 500 });
		}

		return json({ success: true, data });
	} catch (error) {
		console.error('Error in update-client-summary webhook:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
