import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  Heart,
  Share2,
  X,
  Check,
  Edit,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Navigation,
  RefreshCw,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { useGoogleDataRefresh } from "@/hooks/useGoogleDataRefresh";
import { useFavorites } from "@/hooks/useFavorites";
import { LocationMapLink } from "@/components/restaurant/LocationMapLink";
import { AddToListButton } from "@/components/favorites/AddToListButton";
import { ImageGallery } from "@/components/restaurant/ImageGallery";

const RestaurantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isInFavorites, toggleFavorite } = useFavorites();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isRefreshAlertOpen, setIsRefreshAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdminRole();
  }, [user]);

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch restaurant images
  const { data: images = [] } = useQuery({
    queryKey: ["restaurant-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_images")
        .select("*")
        .eq("restaurant_id", id)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      return data?.map((img) => img.url) || [];
    },
    enabled: !!id,
  });

  // Fetch reviews with profile data and images
  const { data: reviews = [] } = useQuery({
    queryKey: ["restaurant-reviews", id],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("restaurant_id", id)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Fetch profiles for reviewers
      const userIds = reviewsData.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { username: string | null; avatar_url: string | null }>);

      // Fetch review images
      const reviewIds = reviewsData.map((r) => r.id);
      const { data: reviewImagesData } = await supabase
        .from("review_images")
        .select("id, review_id, url")
        .in("review_id", reviewIds);

      const imagesMap = (reviewImagesData || []).reduce((acc, img) => {
        if (!acc[img.review_id]) acc[img.review_id] = [];
        acc[img.review_id].push({ id: img.id, url: img.url });
        return acc;
      }, {} as Record<string, { id: string; url: string }[]>);

      return reviewsData.map((review) => ({
        ...review,
        profile: profilesMap[review.user_id] || null,
        profile: profilesMap[review.user_id] || {
          username: "Deleted User",
          avatar_url: "/default_avatar.svg",
        },
        images: imagesMap[review.id] || [],
      }));
    },
    enabled: !!id,
  });

  // Sort reviews: user's own review first, then by date
  const sortedReviews = [...reviews].sort((a, b) => {
    if (user) {
      if (a.user_id === user.id) return -1;
      if (b.user_id === user.id) return 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Google data refresh hook
  const { isRefreshing, refresh } = useGoogleDataRefresh(
    restaurant
      ? {
          id: restaurant.id,
          google_place_id: restaurant.google_place_id,
          google_data_fetched_at: restaurant.google_data_fetched_at,
        }
      : null
  );

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  // Day name mappings - support both short (mon) and full (monday) names
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayNamesShort = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayNamesDisplay: Record<string, string> = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sun: "Sunday",
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
  };
  const today = dayNames[new Date().getDay()];

  // --- Data Parsing and Formatting ---

  // Safely parse potentially stringified JSON data
  const safeParse = <T,>(data: unknown, fallback: T): T => {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return parsed;
      } catch (e) {
        console.error("Failed to parse JSON string:", data);
        return fallback;
      }
    }
    return (data as T) ?? fallback;
  };

  // Opening hours can be either:
  // 1. Simple string format: { mon: "10:00 AM - 11:00 PM", ... } or { monday: "10:00 AM - 11:00 PM", ... }
  // 2. Object format: { mon: { isOpen: true, openTime: "10:00", closeTime: "23:00" }, ... }
  // 3. Object format with full names: { monday: { isOpen: true, openTime: "10:00", closeTime: "23:00" }, ... }

  // Helper to convert 24hr to 12hr format
  const formatTo12Hour = (time24: string): string => {
    if (!time24 || typeof time24 !== "string") return time24;
    if (
      time24.toLowerCase().includes("am") ||
      time24.toLowerCase().includes("pm")
    ) {
      return time24;
    }
    const [hoursStr, minutesStr] = time24.split(":");
    if (!hoursStr || !minutesStr) return time24;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return time24;
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatHoursForDay = (hours: unknown, day: string): string => {
    if (!hours || typeof hours !== "object") return "Closed";

    const hoursObj = hours as Record<string, unknown>;

    // Try full day name first, then short name
    const fullDay = day.length === 3 ? dayNames[dayNamesShort.indexOf(day)] : day;
    const shortDay = day.length > 3 ? dayNamesShort[dayNames.indexOf(day)] : day;

    let dayData = hoursObj[day] || hoursObj[fullDay] || hoursObj[shortDay];

    // Handle simple string format
    if (typeof dayData === "string") {
      if (!dayData || dayData.toLowerCase() === "closed") return "Closed";
      // Parse and reformat to 12hr
      const parts = dayData.split(/\s*[-–]\s*/);
      if (parts.length === 2) {
        return `${formatTo12Hour(parts[0].trim())} - ${formatTo12Hour(
          parts[1].trim()
        )}`;
      }
      return dayData;
    }

    // Handle object format
    if (dayData && typeof dayData === "object") {
      const dayObj = dayData as {
        isOpen?: boolean;
        openTime?: string;
        closeTime?: string;
      };
      if (!dayObj.isOpen) return "Closed";
      if (dayObj.openTime && dayObj.closeTime) {
        return `${formatTo12Hour(dayObj.openTime)} - ${formatTo12Hour(
          dayObj.closeTime
        )}`;
      }
      return "Open";
    }

    return "Closed";
  };

  const openingHours = safeParse<Record<string, unknown> | null>(
    restaurant?.opening_hours,
    null
  );

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === "ArrowLeft") {
        setSelectedImageIndex((prev) =>
          prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
        );
      } else if (e.key === "ArrowRight") {
        setSelectedImageIndex((prev) =>
          prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
        );
      } else if (e.key === "Escape") {
        setSelectedImageIndex(null);
      }
    },
    [selectedImageIndex, images.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Touch swipe for mobile lightbox
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImageIndex !== null) {
      setSelectedImageIndex((prev) =>
        prev !== null ? (prev === images.length - 1 ? 0 : prev + 1) : null
      );
    }
    if (isRightSwipe && selectedImageIndex !== null) {
      setSelectedImageIndex((prev) =>
        prev !== null ? (prev === 0 ? images.length - 1 : prev - 1) : null
      );
    }
  };

  const handleRefreshImages = () => {
    setIsRefreshAlertOpen(false);
    if (restaurant?.google_place_id) {
      toast.promise(refresh(restaurant.google_place_id), {
        loading: "Refreshing images from Google...",
        success: "Images refreshed successfully!",
        error: "Failed to refresh images.",
      });
    } else {
      toast.error("No Google Place ID found for this restaurant");
    }
  };

  const handleDeleteRestaurant = async () => {
      if (!restaurant) return;
      setIsDeleting(true);
      toast.loading("Deleting restaurant...");
  
      try {
        const { error } = await supabase.functions.invoke("delete-restaurant", {
          body: { restaurant_id: restaurant.id },
        });
  
        if (error) {
          throw new Error(error.message);
        }
  
        toast.dismiss();
        toast.success("Restaurant deleted successfully.");
        navigate("/explore");
      } catch (error: any) {
        toast.dismiss();
        toast.error(`Failed to delete restaurant: ${error.message}`);
      } finally {
        setIsDeleting(false);
        setIsDeleteAlertOpen(false);
      }
    };
  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-[300px] sm:h-[400px] w-full rounded-2xl mb-8" />
          <Skeleton className="h-10 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/3 mb-8" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
          <Button onClick={() => navigate("/explore")}>Back to Explore</Button>
        </div>
      </div>
    );
  }

  // Calculate grid layout based on number of images
  const getImageGridClass = (imageCount: number) => {
    if (imageCount === 1) return "grid-cols-1";
    if (imageCount === 2) return "grid-cols-2";
    if (imageCount === 3) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Loading indicator for Google refresh */}
      {isRefreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Refreshing data...</span>
        </div>
      )}

      {/* Back Button & Admin Edit */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/admin?edit=${id}`)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Restaurant</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRefreshAlertOpen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Refresh Images</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setIsDeleteAlertOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete Restaurant</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Image Gallery - Primary + Thumbnails Layout */}
      <div className="container mx-auto px-4 mb-6 sm:mb-8">
        <ImageGallery
          images={images}
          name={restaurant.name}
          onImageClick={(index) => setSelectedImageIndex(index)}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="contents lg:block lg:col-span-2 lg:space-y-8">
            {/* Header */}
            <div className="order-1">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {restaurant.name}
                  </h1>
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-sm sm:text-base">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-gold text-gold" />
                      <span className="font-semibold">{avgRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({reviews.length} reviews)
                      </span>
                    </div>
                    <span className="text-muted-foreground hidden sm:inline">
                      •
                    </span>
                    <span>{restaurant.cuisine_type}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium">{restaurant.price_range}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => id && toggleFavorite(id)}
                    className={cn(
                      "h-10 w-10 sm:h-9 sm:w-9",
                      id && isInFavorites(id) && "text-destructive"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5 sm:h-4 sm:w-4",
                        id && isInFavorites(id) && "fill-current"
                      )}
                    />
                  </Button>
                  {id && <AddToListButton restaurantId={id} variant="button" />}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 sm:h-9 sm:w-9"
                  >
                    <Share2 className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>

              {/* Halal Status */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-4">
                <Badge
                  className={cn(
                    "text-xs sm:text-sm px-2 sm:px-3 py-1",
                    restaurant.halal_status === "Full Halal"
                      ? "bg-halal-full text-halal-full-foreground"
                      : "bg-halal-partial text-halal-partial-foreground"
                  )}
                >
                  {restaurant.halal_status}
                </Badge>
              </div>

              <p className="text-muted-foreground text-sm sm:text-base">
                {restaurant.description}
              </p>
            </div>

            <Separator className="hidden lg:block" />

            {/* Reviews Section */}
            <div className="order-3">
              {(() => {
                const userHasReview =
                  user && sortedReviews.some((r) => r.user_id === user.id);
                return (
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display text-xl sm:text-2xl font-bold">
                      Reviews
                    </h2>
                    {user && !showReviewForm && !userHasReview && (
                      <Button size="sm" onClick={() => setShowReviewForm(true)}>
                        Write a Review
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6">
                  <ReviewForm
                    restaurantId={id!}
                    onSuccess={() => setShowReviewForm(false)}
                    onCancel={() => setShowReviewForm(false)}
                  />
                </div>
              )}

              {sortedReviews.length === 0 && !showReviewForm ? (
                <div className="text-center py-8 sm:py-12 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-3">
                    No reviews yet. Be the first to review!
                  </p>
                  {user && (
                    <Button
                      variant="outline"
                      onClick={() => setShowReviewForm(true)}
                    >
                      Write a Review
                    </Button>
                  )}
                </div>
              ) : sortedReviews.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {sortedReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      currentUserId={user?.id || null}
                      isAdmin={isAdmin}
                      isOwnReview={user?.id === review.user_id}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Sidebar - on mobile shows after reviews */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-last">
            <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
              {/* Contact Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-card border">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base">
                        Address
                      </p>
                      <p className="text-muted-foreground text-xs sm:text-sm break-words">
                        {restaurant.address}
                      </p>
                    </div>
                  </div>

                  {restaurant.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm sm:text-base">
                          Phone
                        </p>
                        <a
                          href={`tel:${restaurant.phone}`}
                          className="text-primary text-xs sm:text-sm hover:underline"
                        >
                          {restaurant.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {restaurant.website_url && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base">
                          Website
                        </p>
                        <a
                          href={restaurant.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs sm:text-sm hover:underline truncate block"
                        >
                          Visit website
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours Card */}
              {openingHours && Object.keys(openingHours).length > 0 && (
                <div className="p-4 sm:p-6 rounded-2xl bg-card border">
                  <Accordion type="single" collapsible defaultValue="hours">
                    <AccordionItem value="hours" className="border-none">
                      <AccordionTrigger className="py-0 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium text-sm sm:text-base">
                              Hours
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Today: {formatHoursForDay(openingHours, today)}
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
                                "flex justify-between text-xs sm:text-sm",
                                day === today && "font-medium text-primary"
                              )}
                            >
                              <span>{dayNamesDisplay[day]}</span>
                              <span>
                                {formatHoursForDay(openingHours, day)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Location Map with Directions */}
              <LocationMapLink
                lat={restaurant.lat}
                lng={restaurant.lng}
                address={restaurant.address}
                name={restaurant.name}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={isRefreshAlertOpen}
        onOpenChange={setIsRefreshAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh Google Images?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace existing Google-sourced images with the latest
              ones from Google. Manual uploads will be kept. This action can be
              costly. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefreshImages}
              disabled={isRefreshing}
            >
              {isRefreshing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              restaurant and all of its associated data, including reviews and
              images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRestaurant}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox with Navigation */}
      <AnimatePresence>
        {selectedImageIndex !== null && images[selectedImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
            onClick={() => setSelectedImageIndex(null)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-background bg-foreground/80 hover:bg-foreground z-10 h-12 w-12 sm:h-10 sm:w-10"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous Button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-background bg-foreground/80 hover:bg-foreground z-10 h-12 w-12 sm:h-14 sm:w-14"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null
                      ? prev === 0
                        ? images.length - 1
                        : prev - 1
                      : null
                  );
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Next Button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-background bg-foreground/80 hover:bg-foreground z-10 h-12 w-12 sm:h-14 sm:w-14"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev !== null
                      ? prev === images.length - 1
                        ? 0
                        : prev + 1
                      : null
                  );
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Swipe hint on mobile */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:hidden">
              Swipe to navigate • Tap to close
            </div>

            <motion.img
              key={selectedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={images[selectedImageIndex]}
              alt={restaurant.name}
              className="max-w-[95vw] max-h-[85vh] sm:max-w-[90vw] sm:max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RestaurantDetails;