import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    console.log('Application letter response webhook - received data:', body);
    
    // Extract the necessary data from the n8n response
    const { 
      application_letter_id, 
      content_html,
      content_text,
      status = 'draft'
    } = body;
    
    if (!application_letter_id) {
      console.error('Missing application_letter_id in webhook response');
      return json({ error: 'Missing application_letter_id' }, { status: 400 });
    }
    
    if (!content_html && !content_text) {
      console.error('Missing content in webhook response');
      return json({ error: 'Missing content' }, { status: 400 });
    }
    
    // Update the application letter with the generated content
    const updates = {
      content_html: content_html || null,
      content_text: content_text || null,
      status: status,
      updated_at: new Date().toISOString()
    };
    
    console.log('Updating application letter with content:', { 
      application_letter_id, 
      has_content_html: !!content_html,
      has_content_text: !!content_text,
      status 
    });
    
    const { error: updateError } = await supabase
      .from('application_letters')
      .update(updates)
      .eq('id', application_letter_id);
    
    if (updateError) {
      console.error('Error updating application letter:', updateError);
      return json({ error: 'Failed to update application letter' }, { status: 500 });
    }
    
    console.log('Successfully updated application letter with content:', application_letter_id);
    
    return json({ 
      success: true, 
      message: 'Application letter updated successfully with content',
      application_letter_id: application_letter_id
    });
    
  } catch (error: any) {
    console.error('Application letter response webhook error:', error);
    return json({ 
      error: error.message,
      details: 'Check server logs for more information'
    }, { status: 500 });
  }
}; 