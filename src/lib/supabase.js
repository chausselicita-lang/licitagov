import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zigghtvlmftgjlohuhla.supabase.co';
const SB_KEY_STORAGE = 'licitagov_sb_anon_key';

let _client = null;

export const getAnonKey = () =>
  import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem(SB_KEY_STORAGE) || '';

export const saveAnonKey = (key) => {
  localStorage.setItem(SB_KEY_STORAGE, key.trim());
  _client = null;
};

export const clearAnonKey = () => {
  localStorage.removeItem(SB_KEY_STORAGE);
  _client = null;
};

export const isSupabaseReady = () => !!getAnonKey();

export const getSupabase = () => {
  const key = getAnonKey();
  if (!key) return null;
  if (!_client) _client = createClient(SUPABASE_URL, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
};
