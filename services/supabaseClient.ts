
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ykxvhhmtdajdkflonzht.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlreHZoaG10ZGFqZGtmbG9uemh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjkyOTQsImV4cCI6MjA3OTg0NTI5NH0.3qFvPSwqhQlsqi4VJFvM0Chbl9ieBKYU32dMHl47Cu4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
