import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hqdflespxzoktqkkwxft.supabase.co'
const supabaseAnonKey = 'sb_publishable_PYvs9FP_p_E9nycieuFPwA_TOYQOlZw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'uniqu' }
})