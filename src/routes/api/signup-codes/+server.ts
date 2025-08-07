import type { RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

// POST: Generate a new code
export const POST: RequestHandler = async ({ request }) => {
  const { count = 1 } = await request.json();
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  const { error } = await supabase.from('signup_codes').insert(
    codes.map(code => ({ code, used: false, given_out: false }))
  );
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ codes }), { status: 201 });
};

// GET: List all codes
export const GET: RequestHandler = async () => {
  const { data, error } = await supabase.from('signup_codes').select('*').order('created_at', { ascending: false });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ codes: data }), { status: 200 });
};

// PUT: Mark code as given out
export const PUT: RequestHandler = async ({ request }) => {
  const { code, given_out, given_to } = await request.json();
  
  const updateData: any = { given_out };
  if (given_to !== undefined) {
    updateData.given_to = given_to;
  }
  
  const { error } = await supabase
    .from('signup_codes')
    .update(updateData)
    .eq('code', code);
    
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}; 