export const SUPABASE_URL = "https://zkaidpqdnmfbmupjkxul.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYWlkcHFkbm1mYm11cGpreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjM4MjQsImV4cCI6MjA5Mzk5OTgyNH0.RiYp2hd_HCZO8ZSPHwOziyEuhANhN3hq29xYrERamdI";
export const ADMIN_EMAIL = "issamzeghib@gmail.com";
export const PRODUCT_MEDIA_BUCKET = "product-media";

export function isSupabaseConfigured() {
  return !SUPABASE_URL.includes("YOUR_PROJECT_ID") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
}
