import { useRef, useCallback, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { Icon, divIcon, LatLngBounds } from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, Star, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGeolocation } from "@/hooks/useGeolocation";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";

interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  halal_status: 'Full Halal' | 'Partial Halal';
  is_sponsored: boolean;
  cuisine_type?: string;
  price_range?: string;
  rating?: number;
  review_count?: number;
  images?: string[];
}

interface RestaurantMapProps {
  restaurants: Restaurant[];
  selectedId?: string;
  onMarkerClick?: (id: string) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  center?: { lat: number; lng: number };
  hoveredId?: string | null;
  zoom?: number;
  isMobile?: boolean;
}

// Custom marker icons
const createMarkerIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 44 : 36;
  const ringClass = isSelected ? 'ring-4 ring-primary/30' : '';
  
  return divIcon({
    className: 'custom-marker',
    html: `
      <div class="w-[${size}px] h-[${size}px] rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all duration-200 ${ringClass}" style="background-color: ${color}; width: ${size}px; height: ${size}px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const getMarkerColor = (restaurant: Restaurant) => {
  if (restaurant.is_sponsored) return '#d4a853'; // Gold for sponsored
  if (restaurant.halal_status === 'Full Halal') return '#2da05a'; // Green for full halal
  return '#d4a853'; // Gold/amber for partial halal
};

// Component to handle map events
const MapEventHandler = ({ 
  onBoundsChange, 
  selectedId, 
  restaurants 
}: { 
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  selectedId?: string;
  restaurants: Restaurant[];
}) => {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    },
  });

  // Fly to selected restaurant
  useEffect(() => {
    if (selectedId) {
      const restaurant = restaurants.find(r => r.id === selectedId);
      if (restaurant) {
        map.flyTo([restaurant.lat, restaurant.lng], 15, { duration: 1 });
      }
    }
  }, [selectedId, restaurants, map]);

  return null;
};

// Component to handle location - always visible with blue icon
const LocationButton = ({ 
  onLocationFound, 
  hasLocation 
}: { 
  onLocationFound: (lat: number, lng: number) => void;
  hasLocation: boolean;
}) => {
  const map = useMap();
  const { latitude, longitude, loading, error, requestLocation } = useGeolocation();

  useEffect(() => {
    if (latitude && longitude) {
      map.flyTo([latitude, longitude], 14, { duration: 1 });
      onLocationFound(latitude, longitude);
    }
  }, [latitude, longitude, map, onLocationFound]);

  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <Button
        size="icon"
        variant="secondary"
        className={cn(
          "shadow-lg border-2 transition-all h-10 w-10 sm:h-8 sm:w-8",
          hasLocation 
            ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" 
            : "bg-card hover:bg-accent border-transparent"
        )}
        onClick={requestLocation}
        disabled={loading}
        title={error || "Use my location"}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
        ) : (
          <Navigation className={cn("h-5 w-5 sm:h-4 sm:w-4", hasLocation && "fill-current")} />
        )}
      </Button>
    </div>
  );
};

// User location marker
const userLocationIcon = divIcon({
  className: 'custom-marker',
  html: `
    <div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg">
      <div class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Mobile annotation overlay with image carousel
const MobileAnnotation = ({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant;
  onClose: () => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = restaurant.images || [];
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImageIndex < images.length - 1) {
        setCurrentImageIndex(prev => prev + 1);
      } else if (diff < 0 && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      }
    }
    touchStartX.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="absolute bottom-28 left-4 right-4 z-[1000] bg-card rounded-xl shadow-elevated border overflow-hidden"
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-foreground/80 hover:bg-foreground text-background"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Image with swipe carousel */}
      {images.length > 0 && (
        <div 
          className="relative h-32 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={images[currentImageIndex]}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          
          {/* Image nav buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-foreground/80 hover:bg-foreground text-background shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-foreground/80 hover:bg-foreground text-background shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {/* Dots indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-full transition-all",
                      idx === currentImageIndex ? "bg-white w-3 h-1.5" : "bg-white/50 w-1.5 h-1.5"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-base text-foreground line-clamp-1 mb-1">
          {restaurant.name}
        </h3>

        <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
          {restaurant.rating !== undefined && restaurant.rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="font-medium">{restaurant.rating.toFixed(1)}</span>
              {restaurant.review_count !== undefined && (
                <span className="text-muted-foreground">({restaurant.review_count})</span>
              )}
            </div>
          )}
          {restaurant.cuisine_type && (
            <span className="text-muted-foreground">• {restaurant.cuisine_type}</span>
          )}
          {restaurant.price_range && (
            <span className="font-medium">• {restaurant.price_range}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              restaurant.halal_status === 'Full Halal'
                ? "bg-halal-full/20 text-halal-full"
                : "bg-halal-partial/20 text-halal-partial"
            )}
          >
            {restaurant.halal_status}
          </Badge>
          
          <NavLink to={`/restaurant/${restaurant.id}`} className="ml-auto">
            <Button
              size="sm"
              className="gap-1"
            >
              View Details
              <ExternalLink className="h-3 w-3" />
            </Button>
          </NavLink>
        </div>
      </div>
    </motion.div>
  );
};

export const RestaurantMap = ({
  restaurants,
  selectedId,
  onMarkerClick,
  onBoundsChange,
  center = { lat: 40.7128, lng: -74.0060 },
  hoveredId,
  zoom = 12,
  isMobile = false,
}: RestaurantMapProps) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  }, []);

  const handleMarkerClick = useCallback((restaurant: Restaurant) => {
    if (isMobile) {
      // On mobile, show the annotation overlay instead of navigating
      setSelectedRestaurant(restaurant);
    } else {
      // On desktop, use the default popup behavior
      onMarkerClick?.(restaurant.id);
    }
  }, [isMobile, onMarkerClick]);

  const closeAnnotation = useCallback(() => {
    setSelectedRestaurant(null);
  }, []);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ zIndex: 0, minHeight: '300px' }}>
      <MapContainer
        key={`${center.lat}-${center.lng}`}
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ width: "100%", height: "100%", minHeight: '300px' }}
        zoomControl={false}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapEventHandler 
          onBoundsChange={onBoundsChange} 
          selectedId={selectedId}
          restaurants={restaurants}
        />

        <LocationButton onLocationFound={handleLocationFound} hasLocation={!!userLocation} />

        {/* User location marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userLocationIcon}
          >
            <Popup>
              <p className="text-sm font-medium">Your location</p>
            </Popup>
          </Marker>
        )}

        {/* Restaurant markers */}
                                <MarkerClusterGroup disableClusteringAtZoom={10} maxClusterRadius={40}>
                                  {restaurants.map((restaurant) => (
                                    <Marker
                                      key={restaurant.id}
                                      position={[restaurant.lat, restaurant.lng]}
                                      icon={createMarkerIcon(
                                        getMarkerColor(restaurant),
                                        selectedId === restaurant.id || selectedRestaurant?.id === restaurant.id || hoveredId === restaurant.id
                                      )}
                                      eventHandlers={{
                                        click: () => handleMarkerClick(restaurant),
                                      }}
                                    >
                                      {!isMobile && (
                                        <Popup>
                                          <div className="w-48">
                                            {restaurant.images && restaurant.images.length > 0 && (
                                              <img src={restaurant.images[0]} alt={restaurant.name} className="h-24 w-full object-cover rounded-md mb-2" />
                                            )}
                                            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{restaurant.name}</h3>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                              <Star className="h-3 w-3 fill-gold text-gold" />
                                              <span>{restaurant.rating?.toFixed(1)}</span>
                                              <span>({restaurant.review_count})</span>
                                            </div>
                                            <NavLink to={`/restaurant/${restaurant.id}`} className="block w-full">
                                              <Button size="sm" className="w-full">
                                                View Details
                                              </Button>
                                            </NavLink>
                                          </div>
                                        </Popup>
                                      )}
                                    </Marker>
                                  ))}
                                </MarkerClusterGroup>      </MapContainer>

      {/* Mobile annotation overlay */}
      <AnimatePresence>
        {isMobile && selectedRestaurant && (
          <MobileAnnotation
            restaurant={selectedRestaurant}
            onClose={closeAnnotation}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RestaurantMap;
