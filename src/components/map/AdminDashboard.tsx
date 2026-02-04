import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

interface RestaurantRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  submission_data: {
    name?: string | { text: string; languageCode?: string };
    address?: string | { text: string; languageCode?: string };
    cuisine_type?: string;
    [key: string]: any;
  };
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const getString = (val: any, fallback: string) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.text && typeof val.text === 'string') return val.text;
  return fallback;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // State to track which specific request is being processed
  // This fixes the issue where all checkmarks load at once
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Fetch pending requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-requests", filter],
    queryFn: async () => {
      let query = supabase
        .from("restaurant_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RestaurantRequest[];
    },
  });

  // Real-time subscription to handle multiple admins
  // This ensures the list updates immediately when another admin takes action
  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'restaurant_requests',
        },
        (payload) => {
          // Invalidate query to refetch data immediately when a change occurs
          queryClient.invalidateQueries({ queryKey: ["admin-requests", filter] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    if (processingId) return; // Prevent multiple clicks
    setProcessingId(id); // Set loading state ONLY for this item

    try {
      // Use conditional update to prevent race conditions (duplicates)
      // Only update if the status is still 'pending'
      const { data, error } = await supabase
        .from("restaurant_requests")
        .update({ 
          status: action,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending") // Optimistic concurrency control
        .select();

      if (error) throw error;

      if (data.length === 0) {
        // If no rows were updated, it means the status was no longer 'pending'
        toast.error("This request was already processed by another admin.");
        // Refresh the list to remove the stale item
        queryClient.invalidateQueries({ queryKey: ["admin-requests", filter] });
      } else {
        toast.success(`Request ${action} successfully`);
      }
    } catch (error: any) {
      toast.error(`Failed to process request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading) return <div className="p-8"><Skeleton className="h-8 w-48" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-display text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
           <div className="space-y-4">
             {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
           </div>
        ) : requests?.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <Check className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">No requests found.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests?.map((request) => {
              const submissionData = request.submission_data || {};
              
              const name = getString(submissionData.name, "Unnamed");
              const address = getString(submissionData.address, "No address");
              const cuisine = getString(submissionData.cuisine_type, "N/A");
              
              return (
              <Card key={request.id} className={request.status !== 'pending' ? 'opacity-75' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>
                        {name}
                      </CardTitle>
                      <CardDescription>
                        {address}
                      </CardDescription>
                    </div>
                    <Badge variant={request.status === 'pending' ? 'outline' : 'secondary'}>{request.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Cuisine:</span> {cuisine}
                    </div>
                    <div>
                      <span className="font-semibold">Submitted:</span> {format(new Date(request.created_at), "PPP")}
                    </div>
                  </div>
                </CardContent>
                {request.status === 'pending' && (
                <CardFooter className="flex justify-end gap-3 bg-muted/10 py-3">
                  <Button 
                    variant="outline" 
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => handleAction(request.id, 'rejected')}
                    disabled={processingId !== null}
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction(request.id, 'approved')}
                    disabled={processingId !== null}
                  >
                    {processingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </CardFooter>
                )}
              </Card>
            )})}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;