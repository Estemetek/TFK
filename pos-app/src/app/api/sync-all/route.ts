import { createClient } from '@supabase/supabase-js';
import { syncMenuAvailability } from '@/app/lib/syncMenuAvailability';

export async function POST() {
  try {
    console.log('🔄 [API] Starting manual sync from API endpoint...');
    
    // Create Supabase client with SERVICE ROLE key (for backend operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!  // Secret key - allows all operations
    );
    
    // Pass the service role client to the sync function
    await syncMenuAvailability(supabase);
    console.log('✅ [API] Sync completed successfully');
    
    return Response.json({ 
      success: true, 
      message: 'Full menu availability sync completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [API] Sync failed:', error);
    return Response.json({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
