import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Clock,
  Check,
  X,
  Loader2,
  Star,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { geocodeAddress } from "@/utils/geocoding";

// This interface represents the structure of the `submission_data` column in the `restaurant_requests` table.
interface SubmissionData {
  name?: string | { text: string; languageCode?: string };
  description?: string;
  address?: string | { text: string; languageCode?: string };
  phone?: string;
  website_url?: string;
  cuisine_type?: string | { text: string; languageCode?: string };
  price_range?: string;
  halal_status?: string;
  
  partial_halal_meats?: string[];
  image_urls?: string[];
  lat?: number;
  lng?: number;
  opening_hours?: Record<string, { isOpen: boolean; openTime?: string; closeTime?: string }>;
}

const getString = (val: any) => {
  if (!val) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.text && typeof val.text === 'string') return val.text;
  return "";
};

const RequestPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectNotes, setRejectNotes] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Fetch request data
  const { data: request, isLoading } = useQuery({
    queryKey: ["request-preview", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const submissionData = (request?.submission_data || {}) as SubmissionData;
  const images = submissionData.image_urls || [];

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      // Geocode address if needed
      let lat = submissionData.lat || 0;
      let lng = submissionData.lng || 0;

      const addressStr = getString(submissionData.address);
      if (lat === 0 && lng === 0 && addressStr) {
        const geocoded = await geocodeAddress(addressStr);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
      }

      // Create the restaurant
      const { data: restaurant, error: insertError } = await supabase
        .from("restaurants")
        .insert({
          name: getString(submissionData.name) || "Unnamed Restaurant",
          address: getString(submissionData.address) || "",
          cuisine_type: getString(submissionData.cuisine_type) || "Other",
          halal_status: (submissionData.halal_status as "Full Halal" | "Partial Halal") || "Full Halal",
          price_range: (submissionData.price_range as "$" | "$$" | "$$$" | "$$$$") || "$$",
          description: submissionData.description || null,
          phone: submissionData.phone || null,
          website_url: submissionData.website_url || null,
          lat,
          lng,
          opening_hours: submissionData.opening_hours || null,
          
          created_by: request?.user_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add images
      if (images.length > 0) {
        const processedImages = await Promise.all(images.map(async (url) => {
          let finalUrl = url;
          
          // Check if image is in submissions folder and move it to restaurants
          if (url.includes('/submissions/')) {
            try {
              const pathParts = url.split('/restaurant-images/');
              if (pathParts.length > 1) {
                let oldPath = decodeURIComponent(pathParts[1]);
                // Strip query parameters if present
                oldPath = oldPath.split('?')[0];
                oldPath = oldPath.replace(/^\/+/, '');
                if (oldPath.startsWith('submissions/')) {
                  const newPath = oldPath.replace('submissions/', 'restaurants/');
                  
                  const { error: moveError } = await supabase.storage
                    .from('restaurant-images')
                    .move(oldPath, newPath);
                    
                  if (!moveError) {
                    const { data: publicUrlData } = supabase.storage
                      .from('restaurant-images')
                      .getPublicUrl(newPath);
                    finalUrl = publicUrlData.publicUrl;
                  } else {
                    // Fallback to copy if move fails (e.g. permissions)
                    const { error: copyError } = await supabase.storage
                      .from('restaurant-images')
                      .copy(oldPath, newPath);
                    if (!copyError) {
                      const { data: publicUrlData } = supabase.storage
                        .from('restaurant-images')
                        .getPublicUrl(newPath);
                      finalUrl = publicUrlData.publicUrl;
                      // Try to delete original
                      await supabase.storage.from('restaurant-images').remove([oldPath]);
                    }
                  }
                }
              }
            } catch (e) {
              console.error("Error moving image:", e);
            }
          }
          return finalUrl;
        }));

        const imageInserts = processedImages.map((url, index) => ({
          restaurant_id: restaurant.id,
          url,
          is_primary: index === 0,
        }));

        await supabase.from("restaurant_images").insert(imageInserts);
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("restaurant_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      return restaurant;
    },
    onSuccess: () => {
      toast.success("Request approved and restaurant created!");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (notes: string) => {
      // Delete images from storage if rejected
      if (images.length > 0) {
        const pathsToDelete = images
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

      const { error } = await supabase
        .from("restaurant_requests")
        .update({
          status: "rejected",
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      navigate("/admin");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const today = dayNames[new Date().getDay()];

  // Helper to convert 24hr to 12hr format
  const formatTo12Hour = (time24: string): string => {
    if (!time24 || typeof time24 !== 'string') return time24;
    if (time24.toLowerCase().includes('am') || time24.toLowerCase().includes('pm')) {
      return time24;
    }
    const [hoursStr, minutesStr] = time24.split(':');
    if (!hoursStr || !minutesStr) return time24;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatHoursForDay = (hours: any, day: string): string => {
    if (!hours || typeof hours !== 'object') return 'Closed';
    
    // Map between short and full day names to check both keys
    const shortDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const fullDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    
    const lowerDay = day.toLowerCase();
    let index = shortDays.indexOf(lowerDay);
    if (index === -1) index = fullDays.indexOf(lowerDay);
    
    if (index === -1) return 'Closed';
    
    // Check all possible key formats (short, full, capitalized)
    const keysToCheck = [
      shortDays[index],
      fullDays[index],
      shortDays[index].charAt(0).toUpperCase() + shortDays[index].slice(1),
      fullDays[index].charAt(0).toUpperCase() + fullDays[index].slice(1)
    ];
    
    const dayData = keysToCheck.reduce((found, key) => found || hours[key], null);
    
    // Handle simple string format
    if (typeof dayData === 'string') {
      if (!dayData || dayData.toLowerCase() === 'closed') return 'Closed';
      // Parse and reformat to 12hr
      const parts = dayData.split(/\s*[-–]\s*/);
      if (parts.length === 2) {
        return `${formatTo12Hour(parts[0].trim())} - ${formatTo12Hour(parts[1].trim())}`;
      }
      return dayData;
    }
    
    // Handle object format
    if (dayData && typeof dayData === 'object') {
      const dayObj = dayData as { isOpen?: boolean; openTime?: string; closeTime?: string };
      if (!dayObj.isOpen) return 'Closed';
      if (dayObj.openTime && dayObj.closeTime) {
        return `${formatTo12Hour(dayObj.openTime)} - ${formatTo12Hour(dayObj.closeTime)}`;
      }
      return 'Open';
    }
    
    return 'Closed';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[400px] w-full rounded-2xl mb-8" />
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/3 mb-8" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Request not found</h1>
          <Button onClick={() => navigate("/admin")}>Back to Admin</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="container mx-auto px-4 mb-8">
          <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden h-[300px] md:h-[400px]">
            <motion.div
              className="col-span-4 md:col-span-2 md:row-span-2 relative cursor-pointer overflow-hidden"
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedImageIndex(0)}
            >
              <img src={images[0]} alt={submissionData.name} className="w-full h-full object-cover" />
            </motion.div>

            {images.slice(1, 5).map((image, idx) => (
              <motion.div
                key={idx}
                className="hidden md:block relative cursor-pointer overflow-hidden"
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedImageIndex(idx + 1)}
              >
                <img src={image} alt={`${submissionData.name} ${idx + 2}`} className="w-full h-full object-cover" />
                {idx === 3 && images.length > 5 && (
                  <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
                    <span className="text-white font-medium">+{images.length - 5} more</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                      {getString(submissionData.name) || "Unnamed Restaurant"}
                    </h1>
                    <Badge variant="outline" className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-muted-foreground">
                    <span>{getString(submissionData.cuisine_type) || "Not specified"}</span>
                    <span>•</span>
                    <span className="font-medium">{submissionData.price_range || "$$"}</span>
                  </div>
                </div>
              </div>

              {/* Halal Status */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <Badge
                  className={cn(
                    "text-sm px-3 py-1",
                    submissionData.halal_status === "Full Halal"
                      ? "bg-halal-full text-halal-full-foreground"
                      : "bg-halal-partial text-halal-partial-foreground"
                  )}
                >
                  {submissionData.halal_status || "Full Halal"}
                </Badge>
              </div>

              {submissionData.halal_status === "Partial Halal" && submissionData.partial_halal_meats && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Halal meat types:</p>
                  <div className="flex gap-2 flex-wrap">
                    {submissionData.partial_halal_meats.map((meat) => (
                      <Badge key={meat} variant="secondary">
                        {meat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-muted-foreground">{submissionData.description || "No description provided."}</p>
            </div>

            <Separator />

            {/* Admin Notes */}
            {request.admin_notes && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-1">Admin Notes:</p>
                <p className="text-muted-foreground">{request.admin_notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            {request.status === "pending" && (
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Approve & Create Restaurant
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" variant="destructive" className="flex-1">
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Request</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this request. This will be visible to the user.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="min-h-[100px]"
                    />
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(rejectNotes)}
                        disabled={rejectMutation.isPending || !rejectNotes.trim()}
                      >
                        {rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Reject Request
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Contact Card */}
              <div className="p-6 rounded-2xl bg-card border">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-muted-foreground text-sm">
                        {getString(submissionData.address) || "Not provided"}
                      </p>
                    </div>
                  </div>

                  {submissionData.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground text-sm">{submissionData.phone}</p>
                      </div>
                    </div>
                  )}

                  {submissionData.website_url && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a
                          href={submissionData.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-sm hover:underline"
                        >
                          Visit website
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours Card */}
              {submissionData.opening_hours && Object.keys(submissionData.opening_hours).length > 0 && (
                <div className="p-6 rounded-2xl bg-card border">
                  <Accordion type="single" collapsible defaultValue="hours">
                    <AccordionItem value="hours" className="border-none">
                      <AccordionTrigger className="py-0 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium">Hours</p>
                            <p className="text-sm text-muted-foreground">
                              Today: {formatHoursForDay(submissionData.opening_hours, today)}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pt-4 space-y-2">
                          {dayNames.map((day) => (
                            <div
                              key={day}
                              className={cn(
                                "flex justify-between text-sm",
                                day === today && "font-medium text-primary"
                              )}
                            >
                              <span className="capitalize">{day}</span>
                              <span>{formatHoursForDay(submissionData.opening_hours, day)}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Submitted Info */}
              <div className="p-6 rounded-2xl bg-card border">
                <p className="text-sm text-muted-foreground">
                  Submitted on {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setSelectedImageIndex(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
                  );
                }}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
                  );
                }}
              >
                <ArrowLeft className="h-6 w-6 rotate-180" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {selectedImageIndex + 1} / {images.length}
              </div>
            </>
          )}

          <img
            src={images[selectedImageIndex]}
            alt={submissionData.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </motion.div>
      )}
    </div>
  );
};

export default RequestPreview;
