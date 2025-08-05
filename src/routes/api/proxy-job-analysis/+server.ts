import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Job analysis proxy - received request body:', body);
    
    // Forward the request to the n8n webhook for job analysis
    const webhookUrl = 'https://manage.app.n8n.cloud/webhook/clients/uniqu-jobanalysis';
    console.log('Job analysis proxy - calling webhook:', webhookUrl);
    console.log('Job analysis proxy - sending data:', JSON.stringify(body, null, 2));
    
    // Try POST first, if it fails, we'll try GET
    let response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    // If POST fails, try GET with query parameters
    if (!response.ok) {
      console.log('Job analysis proxy - POST failed, trying GET with query params');
      const params = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
      
      const getUrl = `${webhookUrl}?${params.toString()}`;
      console.log('Job analysis proxy - trying GET URL:', getUrl);
      
      response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }

    console.log('Job analysis proxy - webhook response status:', response.status);
    console.log('Job analysis proxy - webhook response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Job analysis proxy - webhook error response:', errorText);
      console.error('Job analysis proxy - response status:', response.status);
      console.error('Job analysis proxy - response status text:', response.statusText);
      console.error('Job analysis proxy - response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`n8n webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Job analysis proxy - webhook success response:', result);
    
    // If the response contains company_name and application_letter_id, update the database
    if (result.company_name && result.application_letter_id) {
      console.log('Job analysis proxy - updating database with company name:', result.company_name);
      
      const updates = {
        company_name: result.company_name,
        status: result.status || 'draft',
        updated_at: new Date().toISOString()
      };
      
      // Add job title if provided
      if (result.job_title) {
        updates.job_title = result.job_title;
      }
      
      // Add job URL if provided
      if (result.job_url) {
        updates.job_url = result.job_url;
      }
      
      const { error: updateError } = await supabase
        .from('application_letters')
        .update(updates)
        .eq('id', result.application_letter_id);
      
      if (updateError) {
        console.error('Job analysis proxy - error updating database:', updateError);
      } else {
        console.log('Job analysis proxy - successfully updated database with company name:', result.company_name);
      }
    }
    
    return json(result);
  } catch (error: any) {
    console.error('Job analysis webhook error:', error);
    return json({ 
      error: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}; 