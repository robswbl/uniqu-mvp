import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Job analysis response webhook - received data:', body);
    
    // Extract the necessary data from the n8n response
    const { 
      application_letter_id, 
      company_name, 
      job_title, 
      job_url,
      status = 'completed'
    } = body;
    
    if (!application_letter_id) {
      console.error('Missing application_letter_id in webhook response');
      return json({ error: 'Missing application_letter_id' }, { status: 400 });
    }
    
    if (!company_name) {
      console.error('Missing company_name in webhook response');
      return json({ error: 'Missing company_name' }, { status: 400 });
    }
    
    // Update the application letter with the actual company name and job details
    const updates = {
      company_name: company_name,
      status: status,
      updated_at: new Date().toISOString()
    };
    
    // Add job title if provided
    if (job_title) {
      updates.job_title = job_title;
    }
    
    // Add job URL if provided
    if (job_url) {
      updates.job_url = job_url;
    }
    
    console.log('Updating application letter with:', updates);
    
    const { error: updateError } = await supabase
      .from('application_letters')
      .update(updates)
      .eq('id', application_letter_id);
    
    if (updateError) {
      console.error('Error updating application letter:', updateError);
      return json({ error: 'Failed to update application letter' }, { status: 500 });
    }
    
    console.log('Successfully updated application letter with company name:', company_name);
    
    return json({ 
      success: true, 
      message: 'Application letter updated successfully',
      company_name: company_name
    });
    
  } catch (error: any) {
    console.error('Job analysis response webhook error:', error);
    return json({ 
      error: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}; 