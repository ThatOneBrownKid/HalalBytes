import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Edit, Trash2, X, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ReviewForm } from "./ReviewForm";

interface ReviewCardProps {
  review: {
    id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    restaurant_id: string;
    profile: {
      username: string | null;
      avatar_url: string | null;
    } | null;
    images: { id: string; url: string }[];
  };
  currentUserId: string | null;
  isAdmin: boolean;
  isOwnReview: boolean;
}

export const ReviewCard = ({ review, currentUserId, isAdmin, isOwnReview }: ReviewCardProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const canDelete = isOwnReview || isAdmin;
  const canEdit = isOwnReview;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("delete-review", {
        body: { reviewId: review.id },
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Review deleted");
      // Invalidate queries for the specific restaurant
      queryClient.invalidateQueries({ queryKey: ['restaurant-reviews', review.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-details', review.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-images', review.restaurant_id] });
      // Invalidate the global query for all restaurants
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete review: ${error.message}`);
    },
  });

  const handleDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate();
  };

  if (isEditing) {
    return (
      <ReviewForm
        restaurantId={review.restaurant_id}
        existingReview={{
          id: review.id,
          rating: review.rating,
          comment: review.comment || "",
          images: review.images,
        }}
        onSuccess={() => setIsEditing(false)}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-3 sm:p-4 rounded-xl bg-card border",
          isOwnReview && "ring-2 ring-primary/20"
        )}
      >
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage src={review.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
              {review.profile?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">
                  {review.profile?.username || 'Anonymous'}
                </p>
                {isOwnReview && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem 
                          onClick={() => setShowDeleteDialog(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  className={cn(
                    "h-3 w-3 sm:h-4 sm:w-4",
                    idx < review.rating
                      ? "fill-gold text-gold"
                      : "fill-muted text-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {review.comment && (
          <div 
            className="text-muted-foreground text-sm prose prose-sm max-w-none [&_p]:m-0 [&_ul]:mt-1 [&_ol]:mt-1 mb-3"
            dangerouslySetInnerHTML={{ __html: review.comment }}
          />
        )}

        {/* Review Images */}
        {review.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {review.images.map((image, idx) => (
              <motion.div
                key={image.id}
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedImageIndex(idx)}
              >
                <img
                  src={image.url}
                  alt={`Review image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImageIndex !== null && review.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center"
            onClick={() => setSelectedImageIndex(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 h-10 w-10 bg-foreground/80 hover:bg-foreground text-background"
              onClick={() => setSelectedImageIndex(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {review.images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-foreground/80 hover:bg-foreground text-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => 
                      prev !== null ? (prev === 0 ? review.images.length - 1 : prev - 1) : null
                    );
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-foreground/80 hover:bg-foreground text-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(prev => 
                      prev !== null ? (prev === review.images.length - 1 ? 0 : prev + 1) : null
                    );
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}

            <motion.img
              key={selectedImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={review.images[selectedImageIndex].url}
              alt="Review image"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {review.images.map((_, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === selectedImageIndex ? "bg-primary" : "bg-muted-foreground/50"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
