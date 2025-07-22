import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  try {
    const body = await request.json();
    const webhookResponse = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-applicationletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await webhookResponse.json();
    return json(result, { status: webhookResponse.status });
  } catch (error) {
    return json({ error: error.message || 'Proxy error' }, { status: 500 });
  }
} 