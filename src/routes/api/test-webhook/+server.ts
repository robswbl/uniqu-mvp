import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  try {
    const webhookUrl = 'https://manage.app.n8n.cloud/webhook/clients/uniqu-jobanalysis';
    console.log('Testing webhook URL:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('Webhook test response status:', response.status);
    console.log('Webhook test response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook test error response:', errorText);
      return json({ 
        status: 'error', 
        message: `Webhook not accessible: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: 500 });
    }

    const result = await response.text();
    return json({ 
      status: 'success', 
      message: 'Webhook is accessible',
      response: result
    });
  } catch (error: any) {
    console.error('Webhook test error:', error);
    return json({ 
      status: 'error', 
      message: error.message,
      details: 'Network or connection error'
    }, { status: 500 });
  }
}; 