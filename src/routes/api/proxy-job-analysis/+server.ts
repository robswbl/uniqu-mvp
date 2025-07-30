import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Forward the request to the n8n webhook for job analysis
    const response = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-jobanalysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return json(result);
  } catch (error: any) {
    console.error('Job analysis webhook error:', error);
    return json({ error: error.message }, { status: 500 });
  }
}; 