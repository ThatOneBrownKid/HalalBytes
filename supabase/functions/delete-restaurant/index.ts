import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.94.1";
import { corsHeaders } from "../_shared/cors.ts";

// Log the status of the key (Safe to log True/False)
const hasServiceKey = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
console.log("SERVER STARTUP: Service Role Key present?", hasServiceKey);

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const deleteStorageFolder = async (bucket: string, folderPath: string) => {
  try {
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list(folderPath);

    if (listError) {
      console.error(`Error listing files in ${bucket}/${folderPath}:`, listError);
      return;
    }

    if (!files || files.length === 0) return;

    const filesToDelete = files.map((file) => `${folderPath}/${file.name}`);
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucket)
      .remove(filesToDelete);

    if (deleteError) {
      console.error(`Error deleting files in ${bucket}/${folderPath}:`, deleteError);
    }
  } catch (error) {
    console.error(`Unexpected error deleting folder ${bucket}/${folderPath}:`, error);
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
    
    // 1. Check User
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid Token" }), { headers: corsHeaders, status: 401 });
    }

    // 2. DEBUGGING THE ADMIN CHECK
    // Explicitly check if the Service Key was loaded correctly
    if (!hasServiceKey) {
         return new Response(JSON.stringify({ 
            error: "CONFIGURATION ERROR", 
            message: "The SUPABASE_SERVICE_ROLE_KEY is missing from the environment."
        }), { headers: corsHeaders, status: 500 });
    }

    // Run the query and capture the FULL error
    const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', userData.user.id);

    // IF DB ERROR: Return the exact message from Postgres
    if (roleError) {
        return new Response(JSON.stringify({ 
            error: "DATABASE ERROR", 
            postgres_message: roleError.message, 
            postgres_code: roleError.code,
            hint: roleError.hint
        }), { headers: corsHeaders, status: 500 });
    }

    // IF NO ROW FOUND
    if (!roleData || roleData.length === 0) {
        return new Response(JSON.stringify({ 
            error: "ACCESS DENIED", 
            message: "User not found in user_roles table",
            user_id: userData.user.id
        }), { headers: corsHeaders, status: 401 });
    }

    // CHECK THE ROLE (Handle Enum Case Sensitivity)
    // We check if the string 'admin' exists in the role column
    const isAdmin = roleData.some(r => r.role === 'admin');

    if (!isAdmin) {
         return new Response(JSON.stringify({ 
            error: "ACCESS DENIED", 
            message: "User exists but role is not admin",
            found_roles: roleData
        }), { headers: corsHeaders, status: 401 });
    }

    // --- IF WE PASS HERE, WE ARE GOOD ---

    const { restaurant_id } = await req.json();

    if (typeof restaurant_id !== 'string') {
    return new Response(JSON.stringify({ error: "Invalid restaurant_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
    });
}

    if (!restaurant_id) {
      return new Response(JSON.stringify({ error: "Missing restaurant_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Delete all images associated with the restaurant from storage
    // We check both common path patterns to be thorough
    await deleteStorageFolder("restaurant_images", `restaurants/${restaurant_id}`);
    await deleteStorageFolder("restaurant_images", `${restaurant_id}`);

    // First, get all reviews for the restaurant to delete their images
    const { data: reviews, error: getReviewsError } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("restaurant_id", restaurant_id);

    if (getReviewsError) {
      throw new Error(`Failed to retrieve reviews for deletion: ${getReviewsError.message}`);
    }

    // Delete image folders for each review (Parallelized)
    if (reviews && reviews.length > 0) {
        await Promise.all(reviews.map(async (review) => {
             // Check both common path patterns
             await deleteStorageFolder("review_images", `reviews/${review.id}`);
             await deleteStorageFolder("review_images", `${review.id}`);
        }));

        // Delete review_images records from the database
        const reviewIds = reviews.map((r) => r.id);
        const { error: deleteReviewImagesError } = await supabaseAdmin
            .from("review_images")
            .delete()
            .in("review_id", reviewIds);

        if (deleteReviewImagesError) {
             throw new Error(`Failed to delete review_images records: ${deleteReviewImagesError.message}`);
        }
    }

    // Delete restaurant_images records from the database
    const { error: deleteRestaurantImagesError } = await supabaseAdmin
        .from("restaurant_images")
        .delete()
        .eq("restaurant_id", restaurant_id);

    if (deleteRestaurantImagesError) {
        throw new Error(`Failed to delete restaurant_images records: ${deleteRestaurantImagesError.message}`);
    }

    // Now, delete all reviews associated with the restaurant
    const { error: reviewsError } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("restaurant_id", restaurant_id);

    if (reviewsError) {
      throw new Error(`Failed to delete reviews: ${reviewsError.message}`);
    }

    // Delete all user favorites associated with the restaurant
    const { error: favoritesError } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("restaurant_id", restaurant_id);

    if (favoritesError) {
      throw new Error(`Failed to delete user favorites: ${favoritesError.message}`);
    }

    // Finally, delete the restaurant itself
    const { error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurant_id);

    if (restaurantError) {
      throw new Error(`Failed to delete restaurant: ${restaurantError.message}`);
    }

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