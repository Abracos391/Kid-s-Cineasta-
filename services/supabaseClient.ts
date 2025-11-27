
import { createClient } from '@supabase/supabase-js';

// No Vite, variáveis de ambiente devem começar com VITE_ para serem acessíveis no front-end.
// Aqui tentamos pegar do ambiente (Render), se não existir, usamos o valor hardcoded (Desenvolvimento).

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://ykxvhhmtdajdkflonzht.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlreHZoaG10ZGFqZGtmbG9uemh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjkyOTQsImV4cCI6MjA3OTg0NTI5NH0.3qFvPSwqhQlsqi4VJFvM0Chbl9ieBKYU32dMHl47Cu4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
