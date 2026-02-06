import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, Loader2 } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisine_type: string;
  halal_status: "Full Halal" | "Partial Halal";
  price_range: "$" | "$$" | "$$$" | "$$$$";
  is_sponsored: boolean;
  created_at: string;
}

export const AdminRestaurantList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [halalFilter, setHalalFilter] = useState<string>("all");

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Restaurant[];
    },
  });

  const deleteRestaurantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("delete-restaurant", {
        body: { restaurant_id: id },
      });
      if (error) throw error;
    },
    onMutate: () => {
      toast.loading("Deleting restaurant...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Restaurant deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      toast.dismiss();
      toast.error(`Failed to delete restaurant: ${error.message}`);
    },
  });

  const filteredRestaurants = restaurants?.filter((restaurant) => {
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesHalal =
      halalFilter === "all" || restaurant.halal_status === halalFilter;

    return matchesSearch && matchesHalal;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Manage Restaurants</CardTitle>
            <CardDescription>View, edit, or remove restaurants from the directory.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={halalFilter} onValueChange={setHalalFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Full Halal">Full Halal</SelectItem>
                <SelectItem value="Partial Halal">Partial Halal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredRestaurants && filteredRestaurants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Halal Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRestaurants.map((restaurant) => (
                <TableRow key={restaurant.id}>
                  <TableCell className="font-medium">
                    <div
                      className="cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                    >
                      <div className="hover:underline">{restaurant.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {restaurant.address}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{restaurant.cuisine_type}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        restaurant.halal_status === "Full Halal"
                          ? "bg-halal-full/20 text-halal-full"
                          : "bg-halal-partial/20 text-halal-partial"
                      }
                    >
                      {restaurant.halal_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{restaurant.price_range}</TableCell>
                  <TableCell>
                    {restaurant.is_sponsored && (
                      <Badge className="bg-gold/20 text-gold border-gold/30">
                        Sponsored
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{restaurant.name}"? This will also
                              delete all reviews, images, and favorites associated with this
                              restaurant. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRestaurantMutation.mutate(restaurant.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {deleteRestaurantMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Delete"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">No restaurants found.</p>
        )}
      </CardContent>
    </Card>
  );
};
