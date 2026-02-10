import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.94.1";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Helper to extract { bucket, path } from a public URL
const parseStorageUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/storage/v1/object/public/");
    if (pathParts.length < 2) return null;
    
    const fullPath = pathParts[1]; // e.g., "restaurant-images/folder/img.jpg"
    const firstSlash = fullPath.indexOf("/");
    
    if (firstSlash === -1) return null;

    return {
      bucket: fullPath.substring(0, firstSlash),
      path: fullPath.substring(firstSlash + 1)
    };
  } catch (e) {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Auth Header" }), { headers: corsHeaders, status: 401 });
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid Token" }), { headers: corsHeaders, status: 401 });
    }

    // Check Admin Role
    const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id);

    const isAdmin = roleData?.some(r => r.role === 'admin');
    if (!isAdmin) {
         return new Response(JSON.stringify({ error: "Access Denied" }), { headers: corsHeaders, status: 401 });
    }

    const { restaurant_id } = await req.json();
    if (!restaurant_id) throw new Error("Missing restaurant_id");

    // =========================================================
    // 1. DELETE RESTAURANT IMAGES (Storage & DB)
    // =========================================================
    const { data: restImages } = await supabaseAdmin
      .from("restaurant_images")
      .select("url")
      .eq("restaurant_id", restaurant_id);

    if (restImages?.length) {
      // Group files by bucket to batch delete
      const bucketsToClean: Record<string, string[]> = {};
      
      restImages.forEach((img) => {
        const parsed = parseStorageUrl(img.url);
        if (parsed) {
          if (!bucketsToClean[parsed.bucket]) bucketsToClean[parsed.bucket] = [];
          bucketsToClean[parsed.bucket].push(parsed.path);
        }
      });

      // Execute Delete for each bucket found
      for (const [bucket, paths] of Object.entries(bucketsToClean)) {
        if (paths.length > 0) {
           await supabaseAdmin.storage.from(bucket).remove(paths);
        }
      }
      
      // Delete DB records
      await supabaseAdmin.from("restaurant_images").delete().eq("restaurant_id", restaurant_id);
    }

    // =========================================================
    // 2. DELETE REVIEW IMAGES (Storage & DB)
    // =========================================================
    // First, find all reviews for this restaurant
    const { data: reviews } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("restaurant_id", restaurant_id);

    const reviewIds = reviews?.map(r => r.id) || [];

    if (reviewIds.length > 0) {
      // Get all images linked to these reviews
      const { data: reviewImgs } = await supabaseAdmin
        .from("review_images")
        .select("url")
        .in("review_id", reviewIds);

      if (reviewImgs?.length) {
        const bucketsToClean: Record<string, string[]> = {};

        reviewImgs.forEach((img) => {
          const parsed = parseStorageUrl(img.url);
          if (parsed) {
            if (!bucketsToClean[parsed.bucket]) bucketsToClean[parsed.bucket] = [];
            bucketsToClean[parsed.bucket].push(parsed.path);
          }
        });

        // Delete from storage (Likely 'review-images' bucket)
        for (const [bucket, paths] of Object.entries(bucketsToClean)) {
           if (paths.length > 0) {
             await supabaseAdmin.storage.from(bucket).remove(paths);
           }
        }
        
        // Delete DB records for review images
        await supabaseAdmin.from("review_images").delete().in("review_id", reviewIds);
      }

      // Delete the reviews themselves
      await supabaseAdmin.from("reviews").delete().eq("restaurant_id", restaurant_id);
    }

    // =========================================================
    // 3. CLEAN UP REMAINING TABLES
    // =========================================================
    
    // Delete Favorites
    await supabaseAdmin.from("favorites").delete().eq("restaurant_id", restaurant_id);

    // Delete Restaurant Requests (if any exist for this restaurant)
    // Note: Your schema has 'restaurant_requests' but they might be linked via restaurant_id? 
    // If not, skip this. Assuming strict cleanup:
    // await supabaseAdmin.from("restaurant_requests").delete().eq("restaurant_id", restaurant_id);

    // Finally, Delete the Restaurant
    const { error: finalError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurant_id);

    if (finalError) throw finalError;

    return new Response(JSON.stringify({ message: "Restaurant deleted successfully" }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});