import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCustomCategory } from "@/utils/categoryTagger";
import { cuisineTypeMap } from "@/lib/cuisineTypeMap";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const REFRESH_THRESHOLD_DAYS = 30;

const uploadGooglePhoto = async (url: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    // Save to 'restaurants' folder with a specific prefix to identify refreshed images
    const fileName = `restaurants/google-refresh-${Date.now()}-${Math.random()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, blob);
      
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(fileName);
      
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading Google photo:', error);
    return null;
  }
};

interface RestaurantData {
  id: string;
  google_place_id: string | null;
  google_data_fetched_at: string | null;
}

export const useGoogleDataRefresh = (restaurant: RestaurantData | null) => {
  const queryClient = useQueryClient();

  const refreshMutation = useMutation({
    mutationFn: async (placeId: string) => {
      if (!MAPS_API_KEY) throw new Error("Google API key not configured");

      // Only fetch photos to prevent overwriting other data
      const fields = "photos";
      
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': MAPS_API_KEY,
          'X-Goog-FieldMask': fields,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to refresh Google data");
      }

      const data = await response.json();
      
      // Get new photo URLs directly from Google Places API
      const newPhotoUrls = data.photos?.slice(0, 5).map((photo: any) =>
        `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${MAPS_API_KEY}`
      ) || [];

      return { newPhotoUrls };
    },
    onSuccess: async (data, placeId) => {
      if (!restaurant) return;

      // Update restaurant with refreshed data - only timestamp
      const updateData: any = {
        google_data_fetched_at: new Date().toISOString(),
      };
      
      // Removed updates for opening_hours, description, and cuisine_type
      // to preserve manual edits.

      await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurant.id);

      // Delete old Google photos (those starting with "google-")
      if (data.newPhotoUrls.length > 0) {
        // Get existing images
        const { data: existingImages } = await supabase
          .from('restaurant_images')
          .select('id, url')
          .eq('restaurant_id', restaurant.id);

        // Delete old Google-sourced images (URL contains "google-")
        const googleImages = existingImages?.filter(img => 
          img.url.includes('/google-') || img.url.includes('google-refresh-')
        ) || [];

        if (googleImages.length > 0) {
          // Delete files from storage bucket first
          const pathsToDelete = googleImages
            .map(img => {
              const parts = img.url.split('/restaurant-images/');
              return parts.length > 1 ? decodeURIComponent(parts[1].split('?')[0]) : null;
            })
            .filter((path): path is string => path !== null);

          if (pathsToDelete.length > 0) {
            const { error: removeError } = await supabase.storage
              .from('restaurant-images')
              .remove(pathsToDelete);
              
            if (removeError) console.error('Error removing old images from storage:', removeError);
          }

          await supabase
            .from('restaurant_images')
            .delete()
            .in('id', googleImages.map(img => img.id));
        }

        // Insert new photos
        const remainingCount = (existingImages?.length || 0) - googleImages.length;
        
        for (let i = 0; i < data.newPhotoUrls.length; i++) {
          const googleUrl = data.newPhotoUrls[i];
          const storageUrl = await uploadGooglePhoto(googleUrl);
          
          if (storageUrl) {
            await supabase.from('restaurant_images').insert({
              restaurant_id: restaurant.id,
              url: storageUrl,
              is_primary: remainingCount === 0 && i === 0,
            });
          }
          // Small delay to be gentle on APIs and storage
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-images', restaurant.id] });
    },
  });

  useEffect(() => {
    if (!restaurant?.google_place_id) return;

    // Check if we need to refresh
    const lastFetched = restaurant.google_data_fetched_at 
      ? new Date(restaurant.google_data_fetched_at) 
      : null;

    if (!lastFetched) {
      // Never fetched, refresh now
      refreshMutation.mutate(restaurant.google_place_id);
      return;
    }

    const daysSinceFetch = (Date.now() - lastFetched.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceFetch >= REFRESH_THRESHOLD_DAYS) {
      refreshMutation.mutate(restaurant.google_place_id);
    }
  }, [restaurant?.id, restaurant?.google_place_id, restaurant?.google_data_fetched_at]);

  return {
    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error,
    refresh: refreshMutation.mutate,
  };
};
