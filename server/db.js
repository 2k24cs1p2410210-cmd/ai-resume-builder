import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("CRITICAL: Supabase connection credentials (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) are missing in server/.env");
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
