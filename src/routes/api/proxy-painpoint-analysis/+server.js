import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    console.log('Proxying pain points analysis webhook with data:', body);
    
    const webhookResponse = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu/painpoint-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    // Handle potential incomplete JSON responses
    let result;
    try {
      const responseText = await webhookResponse.text();
      if (!responseText.trim()) {
        throw new Error('Empty response from webhook - possible timeout');
      }
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse webhook response:', parseError);
      throw new Error(`Webhook response error: ${parseError.message}. This may be due to a timeout in the scraping process.`);
    }

    return json(result, { status: webhookResponse.status });
  } catch (error) {
    console.error('Proxy pain points analysis error:', error);
    
    // Provide more detailed error information
    let errorDetails = 'Pain points analysis failed. This may be due to a timeout or network issue.';
    let errorType = 'proxy_error';
    
    if (error.message.includes('timeout')) {
      errorType = 'timeout';
      errorDetails = 'The webhook request timed out. This could be due to the scraping service being slow or overloaded.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = 'network_error';
      errorDetails = 'Network error occurred while calling the webhook service.';
    } else if (error.message.includes('500')) {
      errorType = 'workflow_failure';
      errorDetails = 'The workflow service returned a 500 Internal Server Error. This indicates a server-side issue.';
    }
    
    return json({ 
      error: error.message || 'Proxy error',
      errorType: errorType,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 