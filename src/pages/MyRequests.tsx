import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";


interface RestaurantRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  submission_data: {
    name?: string | { text: string; languageCode?: string };
    address?: string | { text: string; languageCode?: string };
    cuisine_type?: string | { text: string; languageCode?: string };
  };
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const getString = (val: any) => {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.text && typeof val.text === 'string') return val.text;
  return undefined;
};

const MyRequests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }
      const { data, error } = await supabase
        .from("restaurant_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        throw error;
      }
      return data as RestaurantRequest[];
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              My Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your restaurant submission requests
            </p>
          </div>
          <Button onClick={() => navigate("/submit-restaurant")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => {
              const submissionData = request.submission_data || {};
              
              const name = getString(submissionData.name) || "Unnamed Restaurant";
              const address = getString(submissionData.address) || "No address provided";
              const cuisine = getString(submissionData.cuisine_type);

              return (
              <Card key={request.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {name}
                      </CardTitle>
                      <CardDescription>
                        {address}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1.5 capitalize">{request.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Submitted: {format(new Date(request.created_at), "MMM d, yyyy")}
                    </span>
                    {cuisine && (
                      <>
                        <span>•</span>
                        <span>{cuisine}</span>
                      </>
                    )}
                    {request.reviewed_at && (
                      <>
                        <span>•</span>
                        <span>
                          Reviewed: {format(new Date(request.reviewed_at), "MMM d, yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                  {request.admin_notes && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Admin Notes:</p>
                      <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )})}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No requests yet"
            description="You haven't submitted any restaurant requests yet. Know a great halal restaurant? Submit it for review!"
            actionText="Submit a Restaurant"
            onAction={() => navigate("/submit-restaurant")}
          />
        )}
      </main>
    </div>
  );
};

export default MyRequests;
