import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Store, ClipboardList, Plus,
  Check, X, Loader2, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { AdminRestaurantForm } from "@/components/admin/AdminRestaurantForm";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminRestaurantList } from "@/components/admin/AdminRestaurantList";
import { geocodeAddress } from "@/utils/geocoding";

interface RestaurantRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  submission_data: {
    name?: string | { text: string; languageCode?: string };
    address?: string | { text: string; languageCode?: string };
    cuisine_type?: string | { text: string; languageCode?: string };
    halal_status?: string;
    price_range?: string;
    description?: string;
    phone?: string;
    website_url?: string;
    image_urls?: string[];
    lat?: number;
    lng?: number;
  };
  admin_notes: string | null;
  user_id: string;
  created_at: string;
  reviewed_at: string | null;
}

const getString = (val: any) => {
  if (!val) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.text && typeof val.text === 'string') return val.text;
  return "";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  
  // Check if we should open edit mode for a specific restaurant
  const editRestaurantId = searchParams.get('edit');

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [usersResult, restaurantsResult, requestsResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("restaurants").select("id", { count: "exact", head: true }),
        supabase.from("restaurant_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalRestaurants: restaurantsResult.count || 0,
        pendingRequests: requestsResult.count || 0,
      };
    },
  });

  // Fetch requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("restaurant_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter as "pending" | "approved" | "rejected");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RestaurantRequest[];
    },
  });

  // Approve request mutation
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) => {
      const { data: request, error: fetchError } = await supabase
        .from("restaurant_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const submissionData = request.submission_data as RestaurantRequest["submission_data"];

      let lat = submissionData.lat;
      let lng = submissionData.lng;

      const addressStr = getString(submissionData.address);
      if ((!lat || !lng) && addressStr) {
        const geocoded = await geocodeAddress(addressStr);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
      }

      const { data: restaurant, error: insertError } = await supabase.from("restaurants").insert({
        name: getString(submissionData.name) || "Unnamed Restaurant",
        address: getString(submissionData.address) || "",
        cuisine_type: getString(submissionData.cuisine_type) || "Other",
        halal_status: (submissionData.halal_status as "Full Halal" | "Partial Halal") || "Full Halal",
        price_range: (submissionData.price_range as "$" | "$$" | "$$$" | "$$$$") || "$$",
        description: submissionData.description || null,
        phone: submissionData.phone || null,
        website_url: submissionData.website_url || null,
        lat: lat || 40.7128,
        lng: lng || -74.0060,
        opening_hours: submissionData.opening_hours || null,
        created_by: request.user_id,
      })
      .select()
      .single();

      if (insertError) throw insertError;

      // Handle images if present
      if (submissionData.image_urls && Array.isArray(submissionData.image_urls) && submissionData.image_urls.length > 0) {
        const uniqueImageUrls = [...new Set(submissionData.image_urls)];

        const processedImages = await Promise.all(uniqueImageUrls.map(async (url: string) => {
          let finalUrl = url;
          if (!url.includes('/submissions/')) {
            return url; // Not a submission image, return original URL
          }

          try {
            const pathParts = url.split('/restaurant-images/');
            if (pathParts.length <= 1) {
              return url; // Return original URL if path can't be parsed
            }

            let oldPath = decodeURIComponent(pathParts[1]);
            oldPath = oldPath.split('?')[0]; // Strip query parameters

            const newPath = oldPath.replace('submissions/', 'restaurants/');
            
            const { error: copyError } = await supabase.storage
              .from('restaurant-images')
              .copy(oldPath, newPath);

            if (copyError) {
              return url; // Return original URL if all operations fail
            }

            // If copy succeeded, get new public URL and remove old file
            const { data: publicUrlData } = supabase.storage
              .from('restaurant-images')
              .getPublicUrl(newPath);
            finalUrl = publicUrlData.publicUrl;
            
            await supabase.storage.from('restaurant-images').remove([oldPath]);
          } catch (e: any) {
            // Silently fail on unexpected errors to not break the UI
          }
          
          return finalUrl;
        }));

        const imageInserts = processedImages.map((url: string, index: number) => ({
          restaurant_id: restaurant.id,
          url,
          is_primary: index === 0,
        }));

        await supabase.from("restaurant_images").insert(imageInserts);
      }

      const { error: updateError } = await supabase
        .from("restaurant_requests")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Request approved and restaurant created!");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setProcessingRequestId(null);
    },
  });

  // Reject request mutation
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes: string }) => {
      // Fetch request to get images for deletion
      const { data: request } = await supabase
        .from("restaurant_requests")
        .select("submission_data")
        .eq("id", requestId)
        .single();

      if (request?.submission_data) {
        const submissionData = request.submission_data as RestaurantRequest["submission_data"];
        if (submissionData.image_urls && Array.isArray(submissionData.image_urls)) {
          const pathsToDelete = submissionData.image_urls
            .map(url => {
              if (!url.includes('/submissions/')) return null;
              const parts = url.split('/restaurant-images/');
              if (parts.length < 2) return null;
              let path = decodeURIComponent(parts[1]).split('?')[0];
              path = path.replace(/^\/+/, '');
              return path;
            })
            .filter((path): path is string => path !== null && path.startsWith('submissions/'));

          if (pathsToDelete.length > 0) {
            await supabase.storage.from('restaurant-images').remove(pathsToDelete);
          }
        }
      }

      const { error } = await supabase
        .from("restaurant_requests")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "approved":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "rejected":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage users, restaurants, and review pending requests.
          </p>
        </div>

        {/* Stats Cards - Responsive grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-col sm:flex-row items-center sm:justify-between p-2 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-center sm:text-left">Total Users</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
              {statsLoading ? (
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-20 mx-auto sm:mx-0" />
              ) : (
                <div className="text-lg sm:text-2xl font-bold text-center sm:text-left">{stats?.totalUsers}</div>
              )}
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-col sm:flex-row items-center sm:justify-between p-2 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-center sm:text-left">Restaurants</CardTitle>
              <Store className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
              {statsLoading ? (
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-20 mx-auto sm:mx-0" />
              ) : (
                <div className="text-lg sm:text-2xl font-bold text-center sm:text-left">{stats?.totalRestaurants}</div>
              )}
            </CardContent>
          </Card>

          <Card className="p-2 sm:p-0">
            <CardHeader className="flex flex-col sm:flex-row items-center sm:justify-between p-2 sm:pb-2 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-center sm:text-left">Pending</CardTitle>
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
              {statsLoading ? (
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-20 mx-auto sm:mx-0" />
              ) : (
                <div className="text-lg sm:text-2xl font-bold text-center sm:text-left">{stats?.pendingRequests}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <Tabs defaultValue={editRestaurantId ? "create" : "requests"} className="space-y-4 sm:space-y-6">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="requests" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Requests</span>
                {stats?.pendingRequests ? (
                  <Badge variant="secondary" className="ml-1 bg-yellow-500/20 text-yellow-600 text-xs">
                    {stats.pendingRequests}
                  </Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="restaurants" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Store className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Restaurants</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="create" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Add</span>
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Restaurant Requests</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Review and approve or reject submissions.
                    </CardDescription>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                {requestsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : requests && requests.length > 0 ? (
                  <>
                    {/* Mobile card view */}
                    <div className="sm:hidden space-y-3">
                      {requests.map((request) => (
                        <Card key={request.id} className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <button
                              className="font-medium text-sm text-left hover:text-primary transition-colors line-clamp-1"
                              onClick={() => navigate(`/admin/request/${request.id}`)}
                            >
                              {getString(request.submission_data?.name) || "Unnamed"}
                            </button>
                            <Badge variant="outline" className={getStatusBadgeColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">{getString(request.submission_data?.cuisine_type)}</p>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{getString(request.submission_data?.address)}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(request.created_at), "MMM d, yyyy")}
                            </span>
                            {request.status === "pending" && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => {
                                    setProcessingRequestId(request.id);
                                    approveRequestMutation.mutate({ requestId: request.id });
                                  }}
                                  disabled={approveRequestMutation.isPending && processingRequestId === request.id}
                                >
                                  {approveRequestMutation.isPending && processingRequestId === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Reject Request</DialogTitle>
                                      <DialogDescription>
                                        Please provide a reason for rejecting this request.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const notes = formData.get("notes") as string;
                                        rejectRequestMutation.mutate({
                                          requestId: request.id,
                                          adminNotes: notes,
                                        });
                                      }}
                                    >
                                      <Textarea
                                        name="notes"
                                        placeholder="Reason for rejection..."
                                        className="mb-4"
                                        required
                                      />
                                      <DialogFooter>
                                        <Button
                                          type="submit"
                                          variant="destructive"
                                          disabled={rejectRequestMutation.isPending}
                                        >
                                          {rejectRequestMutation.isPending && (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          )}
                                          Reject
                                        </Button>
                                      </DialogFooter>
                                    </form>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop table view */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Restaurant</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>
                                <button
                                  className="font-medium hover:text-primary transition-colors text-left"
                                  onClick={() => navigate(`/admin/request/${request.id}`)}
                                >
                                  {getString(request.submission_data?.name) || "Unnamed"}
                                </button>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                <div>{getString(request.submission_data?.cuisine_type)}</div>
                                <div className="text-xs">{getString(request.submission_data?.address)}</div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(request.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={getStatusBadgeColor(request.status)}>
                                  {request.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {request.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => {
                                          setProcessingRequestId(request.id);
                                          approveRequestMutation.mutate({ requestId: request.id });
                                        }}
                                        disabled={approveRequestMutation.isPending && processingRequestId === request.id}
                                      >
                                        {approveRequestMutation.isPending && processingRequestId === request.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Check className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Reject Request</DialogTitle>
                                            <DialogDescription>
                                              Please provide a reason for rejecting this request.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <form
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              const formData = new FormData(e.currentTarget);
                                              const notes = formData.get("notes") as string;
                                              rejectRequestMutation.mutate({
                                                requestId: request.id,
                                                adminNotes: notes,
                                              });
                                            }}
                                          >
                                            <Textarea
                                              name="notes"
                                              placeholder="Reason for rejection..."
                                              className="mb-4"
                                              required
                                            />
                                            <DialogFooter>
                                              <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={rejectRequestMutation.isPending}
                                              >
                                                {rejectRequestMutation.isPending && (
                                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                )}
                                                Reject Request
                                              </Button>
                                            </DialogFooter>
                                          </form>
                                        </DialogContent>
                                      </Dialog>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No requests found.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants">
            <AdminRestaurantList />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          {/* Create Restaurant Tab */}
          <TabsContent value="create">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">
                  {editRestaurantId ? "Edit Restaurant" : "Add New Restaurant"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {editRestaurantId 
                    ? "Update restaurant details and information." 
                    : "Create a restaurant directly without needing approval."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <AdminRestaurantForm editRestaurantId={editRestaurantId || undefined} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;