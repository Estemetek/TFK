import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    console.log('ℹ️ [API] /sync-all called (sync disabled)');
    
    // Keep endpoint stable for callers, but disable syncing since availability/recipe logic was removed.
    // Still instantiate client to validate env configuration in deployments that rely on this route.
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    return Response.json({ 
      success: true, 
      message: 'Sync disabled: menu availability is no longer auto-managed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [API] /sync-all failed:', error);
    return Response.json({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
