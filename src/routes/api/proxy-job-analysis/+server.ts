import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Job analysis proxy - received request body:', body);
    
    // Forward the request to the n8n webhook for job analysis
    const webhookUrl = 'https://manage.app.n8n.cloud/webhook/clients/uniqu-jobanalysis';
    console.log('Job analysis proxy - calling webhook:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('Job analysis proxy - webhook response status:', response.status);
    console.log('Job analysis proxy - webhook response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Job analysis proxy - webhook error response:', errorText);
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Job analysis proxy - webhook success response:', result);
    return json(result);
  } catch (error: any) {
    console.error('Job analysis webhook error:', error);
    return json({ 
      error: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}; 