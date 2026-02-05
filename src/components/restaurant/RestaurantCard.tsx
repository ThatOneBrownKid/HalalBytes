import { motion } from "framer-motion";
import { Star, MapPin, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageCarousel } from "./ImageCarousel";
import { OpenStatusBadge } from "./OpenStatusBadge";
import { AddToListButton } from "@/components/favorites/AddToListButton";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

interface Restaurant {
  id: string;
  name: string;
  description?: string | null;
  address: string;
  price_range: '$' | '$$' | '$$$' | '$$$$';
  cuisine_type: string;
  halal_status: 'Full Halal' | 'Partial Halal';
  is_sponsored: boolean;
  images: string[];
  rating: number;
  review_count: number;
  opening_hours?: unknown;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  isHighlighted?: boolean;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export const RestaurantCard = ({
  restaurant,
  isHighlighted,
  onFavorite,
  isFavorited = false,
}: RestaurantCardProps) => {
  return (
    <NavLink to={`/restaurant/${restaurant.id}`} className="block">
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isHighlighted ? 1.02 : 1,
        }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "group relative rounded-xl overflow-hidden bg-card border transition-all duration-500",
          isHighlighted && "ring-2 ring-primary shadow-elevated bg-primary/5",
          restaurant.is_sponsored && "ring-1 ring-gold/50"
        )}
      >
        {/* Sponsored Badge */}
        {restaurant.is_sponsored && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className="badge-sponsored text-xs font-medium">
              Promoted
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm transition-all",
              isFavorited && "text-destructive"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFavorite?.(restaurant.id);
            }}
          >
            <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
          </Button>

          {/* Add to List Button */}
          <AddToListButton restaurantId={restaurant.id} variant="icon" />
        </div>

        {/* Image Carousel */}
        <ImageCarousel
          images={restaurant.images}
          alt={restaurant.name}
          className="h-48"
          aspectRatio="auto"
          showButtons={true}
          showDots={true}
        />

        {/* Content */}
        <div className="p-4">
          {/* Top Row: Name & Rating */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-4 w-4 fill-gold text-gold" />
              <span className="font-medium text-sm">
                {restaurant.rating?.toFixed(1) || "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                ({restaurant.review_count || 0})
              </span>
            </div>
          </div>

          {/* Cuisine & Price */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>{restaurant.cuisine_type}</span>
            <span>•</span>
            <span className="font-medium text-foreground">
              {restaurant.price_range}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{restaurant.address}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                restaurant.halal_status === "Full Halal"
                  ? "bg-halal-full text-halal-full-foreground"
                  : "bg-halal-partial text-halal-partial-foreground"
              )}
            >
              {restaurant.halal_status}
            </Badge>

            {/* Open/Closed Status */}
            {restaurant.opening_hours && (
              <OpenStatusBadge
                openingHours={restaurant.opening_hours}
                showDetails={false}
              />
            )}
          </div>
        </div>
      </motion.div>
    </NavLink>
  );
};
