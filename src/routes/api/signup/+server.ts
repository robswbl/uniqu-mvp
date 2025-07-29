import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '$lib/supabaseClient';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      firstName, lastName, email, gender, language, userSearchRegions, userSearchIndustries,
      userStreet, userZip, userCity, userCountry, userPhone, password, signupCode
    } = body;

    // 1. Validate signup code
    const { data: codeData, error: codeError } = await supabase
      .from('signup_codes')
      .select('*')
      .eq('code', signupCode)
      .eq('used', false)
      .single();
    if (codeError || !codeData) {
      return json({ message: 'Invalid or already used signup code.' }, { status: 400 });
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const user_uuid = uuidv4();

    // 3. Insert user
    const { error: userError } = await supabase.from('users').insert({
      user_uuid,
      user_firstname: firstName,
      user_lastname: lastName,
      user_email: email,
      user_gender: gender,
      user_language: language,
      user_search_regions: userSearchRegions,
      user_search_industries: userSearchIndustries,
      user_street: userStreet,
      user_zip: userZip,
      user_city: userCity,
      user_country: userCountry,
      user_phone: userPhone,
      password_hash
    });
    if (userError) {
      return json({ message: userError.message }, { status: 400 });
    }

    // 4. Create questionnaire session
    const { error: sessionError } = await supabase
      .from('questionnaire_sessions')
      .insert({ user_id: user_uuid, status: 'in-progress', created_at: new Date().toISOString() });
    if (sessionError) {
      return json({ message: 'User created, but failed to create session.' }, { status: 400 });
    }

    // 5. Mark code as used
    await supabase
      .from('signup_codes')
      .update({ used: true, used_by: email, used_at: new Date().toISOString() })
      .eq('code', signupCode);

    return json({ success: true });
  } catch (err: any) {
    return json({ message: err.message || 'Signup failed.' }, { status: 500 });
  }
}; 