import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Use service role key for elevated privileges
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reviewId } = await req.json();
    if (!reviewId) {
      throw new Error("reviewId is required");
    }

    // 1. Find all image URLs associated with the review from review_images table
    const { data: reviewImages, error: selectError } = await supabase
      .from("review_images")
      .select("url")
      .eq("review_id", reviewId);

    if (selectError) {
      console.error("Error fetching review images:", selectError);
      throw selectError;
    }

    // 2. If there are images, delete them from tables and storage
    if (reviewImages && reviewImages.length > 0) {
      const imageUrls = reviewImages.map((img) => img.url);

      // Delete from restaurant_images table
      const { error: deleteRestImagesError } = await supabase
        .from("restaurant_images")
        .delete()
        .in("url", imageUrls);

      if (deleteRestImagesError) {
        console.error(
          "Error deleting from restaurant_images table:",
          deleteRestImagesError
        );
        // We might not want to throw, to allow deletion to continue
      }

      // Delete from storage
      const imageFileNames = imageUrls.map(url => url.substring(url.lastIndexOf('/') + 1));
      const { error: storageError } = await supabase.storage
        .from("restaurant-images")
        .remove(imageFileNames);

      if (storageError) {
        console.error("Error deleting images from storage:", storageError);
        // Do not throw an error, as we want to proceed with deleting DB records
      }
    }

    // 3. Delete entries from the review_images table
    const { error: deleteReviewImagesError } = await supabase
      .from("review_images")
      .delete()
      .eq("review_id", reviewId);

    if (deleteReviewImagesError) {
      console.error("Error deleting from review_images:", deleteReviewImagesError);
      throw deleteReviewImagesError;
    }

    // 4. Delete the review from the reviews table
    const { error: deleteReviewError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (deleteReviewError) {
      console.error("Error deleting review:", deleteReviewError);
      throw deleteReviewError;
    }

    return new Response(JSON.stringify({ message: "Review deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});