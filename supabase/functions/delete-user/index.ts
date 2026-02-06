import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) throw new Error('User not found')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get user profile to find avatar
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single()

    // 2. Delete avatar from storage if exists
    if (profile?.avatar_url) {
        // Handle both full URL and relative path
        let path = profile.avatar_url
        if (path.includes('/avatars/')) {
            path = path.split('/avatars/')[1]
        }
        
        // Only delete if it looks like a relative path (not an external URL)
        if (path && !path.startsWith('http')) {
            const { error: storageError } = await supabaseAdmin.storage.from('avatars').remove([path])
            if (storageError) {
                console.error("Error deleting avatar:", storageError);
            }
        }
    }

    // 3. Delete the user
    // The database is configured with ON DELETE SET NULL for reviews, so we don't need to manually anonymize them.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id
    )

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: 'Account deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})