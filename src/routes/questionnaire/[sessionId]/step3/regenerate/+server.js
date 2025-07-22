import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';
// UUID generator (RFC4122 version 4 compliant)
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
export async function POST({ params, request }) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    // Fetch user_id from questionnaire_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('questionnaire_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();
    if (sessionError || !sessionData?.user_id) {
      return json({ error: 'Could not find user_id for session.' }, { status: 400 });
    }
    const user_id = sessionData.user_id;
    // Generate a new generation_id
    const generation_id = uuidv4();
    // Set last_regeneration and generation_id to now before triggering the webhook
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('questionnaire_sessions')
      .update({ last_regeneration: now, generation_id })
      .eq('id', sessionId);
    if (updateError) {
      return json({ error: 'Failed to update last_regeneration or generation_id.' }, { status: 500 });
    }
    // Call your n8n webhook to regenerate the analysis
    const webhookResponse = await fetch('https://manage.app.n8n.cloud/webhook/clients/uniqu-trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id,
        generation_id,
        action: 'regenerate',
        ...body
      })
    });
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      return json(
        {
          error: `Regeneration failed: ${webhookResponse.status} ${webhookResponse.statusText}`,
          details: errorText
        },
        { status: webhookResponse.status }
      );
    }
    const result = await webhookResponse.json();
    return json({
      success: true,
      result,
      message: 'Analysis regeneration started successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}