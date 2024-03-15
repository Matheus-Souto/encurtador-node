import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL; // Ajuste com sua variável de ambiente
const supabaseAnonKey = process.env.SUPABASE_KEY; // Ajuste com sua variável de ambiente

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;