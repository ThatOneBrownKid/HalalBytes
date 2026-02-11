import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Favorite {
  id: string;
  list_name: string;
  restaurant_id: string;
  restaurant: {
    id: string;
    name: string;
    description: string | null;
    address: string;
    price_range: "$" | "$$" | "$$$" | "$$$$";
    cuisine_type: string;
    halal_status: "Full Halal" | "Partial Halal";
    is_sponsored: boolean;
    opening_hours: unknown;
    reviews: { rating: number }[];
  };
}

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all favorites for the current user
  const { data: favorites = [], isLoading, refetch } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          list_name,
          restaurant_id,
          restaurant:restaurants (
            id,
            name,
            description,
            address,
            price_range,
            cuisine_type,
            halal_status,
            is_sponsored,
            opening_hours,
            reviews (rating)
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user,
  });

  // Get unique list names from DB
  const dbListNames = [...new Set(favorites.map((f) => f.list_name))];

  // Get temporary lists from localStorage
  const getTempLists = () => {
    const stored = localStorage.getItem("tempFavoriteLists");
    return stored ? JSON.parse(stored) : [];
  };

  const tempLists = getTempLists();
  
  const listNames = [...new Set([...dbListNames, ...tempLists])];


  // Check if a restaurant is favorited
  const isFavorited = (restaurantId: string) => {
    return favorites.some((f) => f.restaurant_id === restaurantId);
  };

  // Get the favorite entry for a restaurant
  const getFavorite = (restaurantId: string) => {
    return favorites.find((f) => f.restaurant_id === restaurantId);
  };

  // Add to favorites
  const addFavoriteMutation = useMutation({
    mutationFn: async ({ restaurantId, listName = "Favorites" }: { restaurantId: string; listName?: string }) => {
      if (!user) throw new Error("Must be logged in");

      // Check for list limit
      if (listName !== "Favorites") {
        const { data: existingListsData, error: existingListsError } = await supabase
          .from("favorites")
          .select("list_name")
          .eq("user_id", user.id);

        if (existingListsError) throw existingListsError;
        
        const uniqueLists = [...new Set(existingListsData.map(item => item.list_name))];
        if (!uniqueLists.includes(listName) && uniqueLists.filter(l => l !== 'Favorites').length >= 5) {
          throw new Error("You can only have a maximum of 5 custom lists.");
        }
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          list_name: listName,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Added to favorites");

      // Remove from temp lists if it exists
      const tempLists = JSON.parse(localStorage.getItem("tempFavoriteLists") || "[]");
      if (tempLists.includes(data.list_name)) {
        const newTempLists = tempLists.filter((l: string) => l !== data.list_name);
        localStorage.setItem("tempFavoriteLists", JSON.stringify(newTempLists));
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove from favorites
  const removeFavoriteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!user) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success("Removed from favorites");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle favorite (only for default "Favorites" list)
  const toggleFavorite = async (restaurantId: string) => {
    if (!user) {
      toast.error("Please sign in to save favorites");
      return;
    }

    const existing = getFavorite(restaurantId);
    
    // Only toggle if it's in the default "Favorites" list or not favorited at all
    if (existing && existing.list_name === "Favorites") {
      await removeFavoriteMutation.mutateAsync(restaurantId);
    } else if (!existing) {
      await addFavoriteMutation.mutateAsync({ restaurantId, listName: "Favorites" });
    } else {
      // It's in a custom list, just add to Favorites as well (or do nothing)
      toast.info("This restaurant is already saved in a custom list");
    }
  };

  // Check if in default Favorites list specifically
  const isInFavorites = (restaurantId: string) => {
    return favorites.some((f) => f.restaurant_id === restaurantId && f.list_name === "Favorites");
  };

  // Move to a different list
  const moveToList = async (restaurantId: string, newListName: string) => {
    if (!user) {
      toast.error("Please sign in to manage lists");
      return;
    }

    // Check for list limit
    if (newListName !== "Favorites") {
      const { data: existingListsData, error: existingListsError } = await supabase
        .from("favorites")
        .select("list_name")
        .eq("user_id", user.id);

      if (existingListsError) {
        toast.error(existingListsError.message);
        return;
      }
      
      const uniqueLists = [...new Set(existingListsData.map(item => item.list_name))];
      if (!uniqueLists.includes(newListName) && uniqueLists.filter(l => l !== 'Favorites').length >= 5) {
        toast.error("You can only have a maximum of 5 custom lists.");
        return;
      }
    }

    const existing = getFavorite(restaurantId);
    if (existing) {
      // Update the list name
      const { error } = await supabase
        .from("favorites")
        .update({ list_name: newListName })
        .eq("id", existing.id);

      if (error) {
        toast.error(error.message);
      } else {
        queryClient.invalidateQueries({ queryKey: ["favorites"] });
        toast.success(`Moved to ${newListName}`);

        // Remove from temp lists if it exists
        const tempLists = JSON.parse(localStorage.getItem("tempFavoriteLists") || "[]");
        if (tempLists.includes(newListName)) {
          const newTempLists = tempLists.filter((l: string) => l !== newListName);
          localStorage.setItem("tempFavoriteLists", JSON.stringify(newTempLists));
        }
      }
    } else {
      // Add to the new list
      await addFavoriteMutation.mutateAsync({ restaurantId, listName: newListName });
    }
  };

  // Delete an entire list (remove all favorites in that list)
  const deleteList = async (listName: string) => {
    if (!user) return;
    if (listName === "Favorites") {
      toast.error("Cannot delete the default Favorites list");
      return;
    }

    // Always try to remove from localStorage first
    const tempLists = JSON.parse(localStorage.getItem("tempFavoriteLists") || "[]");
    if (tempLists.includes(listName)) {
      const newTempLists = tempLists.filter((l: string) => l !== listName);
      localStorage.setItem("tempFavoriteLists", JSON.stringify(newTempLists));
    }

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("list_name", listName);

    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(`Deleted list "${listName}"`);
    }
  };

  return {
    favorites,
    listNames,
    isLoading,
    isFavorited,
    isInFavorites,
    getFavorite,
    toggleFavorite,
    moveToList,
    deleteList,
    refetch,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    isPending: addFavoriteMutation.isPending || removeFavoriteMutation.isPending,
  };
};
