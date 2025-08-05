import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Test application letter webhook - received data:', body);
    
    // Test the webhook endpoint
    const webhookUrl = 'http://localhost:5173/api/webhook-application-letter-response';
    console.log('Testing webhook URL:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('Test webhook response status:', response.status);
    console.log('Test webhook response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Test webhook error response:', errorText);
      return json({ 
        status: 'error', 
        message: `Webhook failed: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: 500 });
    }

    const result = await response.json();
    return json({ 
      status: 'success', 
      message: 'Webhook test completed successfully',
      response: result
    });
  } catch (error: any) {
    console.error('Test webhook error:', error);
    return json({ 
      status: 'error', 
      message: error.message,
      details: 'Network or connection error'
    }, { status: 500 });
  }
}; 