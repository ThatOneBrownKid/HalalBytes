import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  serviceRoleKey ?? ""
);

serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`);

  // Handle the preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header. Incoming headers:", Object.fromEntries(req.headers.entries()));
      return new Response(JSON.stringify({ error: "Authorization header is missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError) throw userError;
    if (!user) {
        return new Response(JSON.stringify({ error: "User not found." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
        });
    }

    const userId = user.id;

    // Set user-related fields to NULL in tables without ON DELETE CASCADE
    const updates = [
      supabaseAdmin.from('restaurants').update({ created_by: null }).eq('created_by', userId),
      supabaseAdmin.from('restaurants').update({ approved_by: null }).eq('approved_by', userId),
      supabaseAdmin.from('restaurant_images').update({ uploaded_by: null }).eq('uploaded_by', userId),
      supabaseAdmin.from('review_images').update({ uploaded_by: null }).eq('uploaded_by', userId),
      supabaseAdmin.from('reviews').update({ user_id: null }).eq('user_id', userId),
    ];
    
    await Promise.all(updates);

    // Delete the user from auth.users, which will cascade to other tables
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing delete-user request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});