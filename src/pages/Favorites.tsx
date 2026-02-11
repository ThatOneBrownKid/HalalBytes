import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, Plus, Trash2, FolderHeart, Edit2, MoreVertical, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFavorites } from "@/hooks/useFavorites";

interface FavoriteWithRestaurant {
  id: string;
  list_name: string;
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

const Favorites = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { listNames: existingListNames, deleteList, moveToList } = useFavorites();
  
  const [newListName, setNewListName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [deleteListName, setDeleteListName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Favorites");

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id,
          list_name,
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
      return data as unknown as FavoriteWithRestaurant[];
    },
    enabled: !!user,
  });

  const { data: restaurantImages } = useQuery({
    queryKey: ["restaurant-images-favorites"],
    queryFn: async () => {
      const restaurantIds = favorites?.map((f) => f.restaurant.id) || [];
      if (restaurantIds.length === 0) return {};

      const { data, error } = await supabase
        .from("restaurant_images")
        .select("restaurant_id, url")
        .in("restaurant_id", restaurantIds);

      if (error) throw error;

      return data.reduce((acc, img) => {
        if (!acc[img.restaurant_id]) acc[img.restaurant_id] = [];
        acc[img.restaurant_id].push(img.url);
        return acc;
      }, {} as Record<string, string[]>);
    },
    enabled: !!favorites && favorites.length > 0,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const renameListMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (!user) throw new Error("Must be logged in");
      
      const { error } = await supabase
        .from("favorites")
        .update({ list_name: newName })
        .eq("user_id", user.id)
        .eq("list_name", oldName);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Renamed to "${variables.newName}"`);
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      setEditingList(null);
      setActiveTab(variables.newName);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCreateList = () => {
    const trimmedName = newListName.trim();
    if (!trimmedName) return;

    const allLists = existingListNames;
    if (allLists.includes(trimmedName)) {
      toast.error(`List "${trimmedName}" already exists.`);
      return;
    }

    if (allLists.filter(l => l !== 'Favorites').length >= 5) {
      toast.error("You can only have a maximum of 5 custom lists.");
      return;
    }
    
    const tempLists = JSON.parse(localStorage.getItem("tempFavoriteLists") || "[]");
    localStorage.setItem("tempFavoriteLists", JSON.stringify([...tempLists, trimmedName]));

    queryClient.invalidateQueries({ queryKey: ["favorites"] });
    setActiveTab(trimmedName);
    setNewListName("");
    setIsCreateDialogOpen(false);
    toast.success(`List "${trimmedName}" created. Add restaurants to populate it.`);
  };

  const handleRenameList = () => {
    if (!editingList || !editedName.trim()) return;
    if (editingList === "Favorites") {
      toast.error("Cannot rename the default Favorites list");
      setEditingList(null);
      return;
    }
    renameListMutation.mutate({ oldName: editingList, newName: editedName.trim() });
  };

  const handleDeleteList = async () => {
    if (!deleteListName) return;
    await deleteList(deleteListName);
    setDeleteListName(null);
    setActiveTab("Favorites");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    navigate("/auth/signin");
    return null;
  }

  const listNames = existingListNames;
  // Ensure Favorites is always first
  const orderedListNames = ["Favorites", ...listNames.filter(n => n !== "Favorites")];
  const uniqueListNames = [...new Set(orderedListNames)];

  const getRestaurantsInList = (listName: string) => {
    return favorites?.filter((f) => f.list_name === listName) || [];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Favorites & Lists
            </h1>
            <p className="text-muted-foreground mt-1">
              Your saved restaurants organized in lists
            </p>
          </div>
          
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New List
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : uniqueListNames.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <TabsList className="flex-shrink-0">
                {uniqueListNames.map((listName) => (
                  <TabsTrigger key={listName} value={listName} className="gap-2">
                    <FolderHeart className="h-4 w-4" />
                    {editingList === listName ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-6 w-24 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameList();
                            if (e.key === "Escape") setEditingList(null);
                          }}
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={handleRenameList}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingList(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {listName}
                        <Badge variant="secondary" className="ml-1">
                          {getRestaurantsInList(listName).length}
                        </Badge>
                      </>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* List actions dropdown */}
              {activeTab !== "Favorites" && !editingList && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={() => {
                        setEditingList(activeTab);
                        setEditedName(activeTab);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename List
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeleteListName(activeTab)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {uniqueListNames.map((listName) => (
              <TabsContent key={listName} value={listName}>
                {getRestaurantsInList(listName).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getRestaurantsInList(listName).map((fav) => {
                      const reviews = fav.restaurant.reviews || [];
                      const avgRating = reviews.length > 0
                        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                        : 0;
                      return (
                        <div key={fav.id} className="relative">
                          <RestaurantCard
                            restaurant={{
                              ...fav.restaurant,
                              images: restaurantImages?.[fav.restaurant.id] || [],
                              rating: avgRating,
                              review_count: reviews.length,
                            }}
                            isFavorited={true}
                            onFavorite={() => removeFavoriteMutation.mutate(fav.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FolderHeart className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">This list is empty</h3>
                      <p className="text-muted-foreground text-center mb-6">
                        Add restaurants from the Explore page using the folder icon.
                      </p>
                      <Button onClick={() => navigate("/explore")} className="gap-2">
                        Explore Restaurants
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">No favorites yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start exploring and save your favorite restaurants!
                <br />
                Click the heart icon on any restaurant to add it here.
              </p>
              <Button onClick={() => navigate("/explore")} className="gap-2">
                Explore Restaurants
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Create List Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Give your list a name to organize your favorite restaurants.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g., Date Night, Work Lunch..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!newListName.trim()}>
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete List Confirmation */}
      <AlertDialog open={!!deleteListName} onOpenChange={() => setDeleteListName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteListName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all restaurants from this list. The restaurants won't be deleted, just removed from this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteList}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete List
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Favorites;
