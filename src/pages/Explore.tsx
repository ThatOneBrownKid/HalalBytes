import { useState, useCallback, useMemo, lazy, Suspense, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Map, List, Star, MapPin } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { RestaurantSearchBar } from "@/components/search/RestaurantSearchBar";
import { FilterBar, Filters } from "@/components/filters/FilterBar";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { LocationSelector } from "@/components/location/LocationSelector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useIsMobile } from "@/hooks/use-mobile";
import { checkIfOpen } from "@/utils/timeFormat";

// Lazy load the map to avoid context issues
const RestaurantMap = lazy(() => import("@/components/map/RestaurantMap").then(m => ({ default: m.RestaurantMap })));

const distanceOptions = [5, 10, 25, 50, 100];

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  price_range: '$' | '$$' | '$$$' | '$$$$';
  cuisine_type: string;
  halal_status: 'Full Halal' | 'Partial Halal';
  is_sponsored: boolean;
  images: string[];
  rating: number;
  review_count: number;
  opening_hours: unknown;
}

// Fetch user's approximate location from IP
const fetchIPLocation = async (): Promise<{ lat: number; lng: number; city: string } | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) return null;
    const data = await response.json();
    return {
      lat: data.latitude,
      lng: data.longitude,
      city: `${data.city}, ${data.region_code || data.region}`
    };
  } catch (error) {
    console.error('Failed to fetch IP location:', error);
    return null;
  }
};

// Calculate distance in km between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Explore = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isMobile = useIsMobile();
  const { isInFavorites, toggleFavorite } = useFavorites();

  
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>();
  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Loading...");
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.0060 });
  const [filters, setFilters] = useState({
    priceRange: [] as string[],
    cuisineTypes: [] as string[],
    halalStatus: [] as string[],
    openNow: false,
    distance: 50,
  });
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  // Set location from URL search params if available
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const location = searchParams.get('location');

    if (lat && lng) {
      setMapCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
      if (location) {
        setCurrentLocation(location);
      }
    }
  }, [searchParams]);

  // Fetch IP-based location on mount if no location in URL
  useEffect(() => {
    // Only fetch IP location if there's no location from the URL
    if (!searchParams.has('lat') || !searchParams.has('lng')) {
      fetchIPLocation().then(location => {
        if (location) {
          setMapCenter({ lat: location.lat, lng: location.lng });
          setCurrentLocation(location.city);
        } else {
          // Fallback to a default location if IP lookup fails
          setCurrentLocation("New York, NY");
        }
      });
    }
  }, [searchParams]);

  // Fetch restaurants from database
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      // Fetch restaurants with their images
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*');

      if (restaurantsError) throw restaurantsError;

      // Fetch images for all restaurants
      const { data: imagesData, error: imagesError } = await supabase
        .from('restaurant_images')
        .select('restaurant_id, url, is_primary')
        .order('is_primary', { ascending: false });

      if (imagesError) throw imagesError;

      // Fetch review stats for each restaurant
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('restaurant_id, rating');

      if (reviewsError) throw reviewsError;

      // Group images by restaurant
      const imagesByRestaurant = imagesData?.reduce((acc, img) => {
        if (!acc[img.restaurant_id]) {
          acc[img.restaurant_id] = [];
        }
        acc[img.restaurant_id].push(img.url);
        return acc;
      }, {} as Record<string, string[]>) || {};

      // Calculate avg rating and review count per restaurant
      const reviewStatsByRestaurant = reviewsData?.reduce((acc, review) => {
        if (!acc[review.restaurant_id]) {
          acc[review.restaurant_id] = { total: 0, count: 0 };
        }
        acc[review.restaurant_id].total += review.rating;
        acc[review.restaurant_id].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>) || {};

      return restaurantsData?.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        price_range: r.price_range as '$' | '$$' | '$$$' | '$$$$',
        cuisine_type: r.cuisine_type,
        halal_status: r.halal_status as 'Full Halal' | 'Partial Halal',
        is_sponsored: r.is_sponsored,
        images: imagesByRestaurant[r.id] || [],
        rating: reviewStatsByRestaurant[r.id] 
          ? reviewStatsByRestaurant[r.id].total / reviewStatsByRestaurant[r.id].count 
          : 0,
        review_count: reviewStatsByRestaurant[r.id]?.count || 0,
        opening_hours: r.opening_hours,
      })) as Restaurant[];
    },
  });

  // Filter restaurants based on active filters and distance
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      // Filter by distance from current map center
      const distance = calculateDistance(mapCenter.lat, mapCenter.lng, restaurant.lat, restaurant.lng);
      if (distance > filters.distance) {
        return false;
      }

      // Filter by Open Now
      if (filters.openNow) {
        const { isOpen } = checkIfOpen(restaurant.opening_hours);
        if (!isOpen) return false;
      }

      if (filters.priceRange.length > 0 && !filters.priceRange.includes(restaurant.price_range)) {
        return false;
      }
      if (filters.cuisineTypes.length > 0 && !filters.cuisineTypes.includes(restaurant.cuisine_type)) {
        return false;
      }
      if (filters.halalStatus.length > 0 && !filters.halalStatus.includes(restaurant.halal_status)) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.cuisine_type.toLowerCase().includes(query) ||
          restaurant.address.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [restaurants, filters, searchQuery, mapCenter]);

  // Sort with sponsored first
  const sortedRestaurants = useMemo(() => {
    return [...filteredRestaurants].sort((a, b) => {
      if (a.is_sponsored && !b.is_sponsored) return -1;
      if (!a.is_sponsored && b.is_sponsored) return 1;
      return b.rating - a.rating;
    });
  }, [filteredRestaurants]);

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedRestaurantId(id);
    setHighlightedCardId(id);
    
    // Find the index of the restaurant in the sorted list
    const index = sortedRestaurants.findIndex(r => r.id === id);
    if (index !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index,
        align: 'center',
        behavior: 'smooth'
      });
    }
    
    // On mobile, switch to list view when marker is clicked
    if (window.innerWidth < 1024) {
      setMobileView('list');
    }
    
    // Clear highlight after a delay
    setTimeout(() => setHighlightedCardId(undefined), 3000);
  }, [sortedRestaurants]);

  const handleCardSelect = useCallback((id: string) => {
    navigate(`/restaurant/${id}`);
  }, [navigate]);

  const handleBoundsChange = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    setMapBounds(bounds);
  }, []);

  const handleLocationChange = useCallback((location: string, coords?: { lat: number; lng: number }) => {
    setCurrentLocation(location);
    if (coords) {
      setMapCenter(coords);
    }
  }, []);

  const mapRestaurants = useMemo(() => {
    return sortedRestaurants.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      halal_status: r.halal_status,
      is_sponsored: r.is_sponsored,
      cuisine_type: r.cuisine_type,
      price_range: r.price_range,
      rating: r.rating,
      review_count: r.review_count,
      images: r.images,
    }));
  }, [sortedRestaurants]);


  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />

      {/* Search & Filters Bar - Mobile optimized */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-16 z-40 w-full">
        <div className="max-w-full px-3 sm:container sm:mx-auto sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3">
            {/* Search row */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <div className="flex-1 min-w-0 overflow-hidden">
                <RestaurantSearchBar
                  placeholder="Search restaurants..."
                  onSearch={(q) => setSearchQuery(q)}
                  onRestaurantSelect={(id) => navigate(`/restaurant/${id}`)}
                  className="w-full"
                />
              </div>
              <LocationSelector
                currentLocation={currentLocation}
                onLocationChange={handleLocationChange}
              />
              {/* Filters button close to location on desktop */}
              <div className="hidden lg:block">
                <FilterBar filters={filters} onFiltersChange={setFilters} />
              </div>
            </div>
            {/* Filters row - mobile only */}
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-thin lg:hidden">
              <FilterBar filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Mobile View Toggle */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="flex bg-card rounded-full shadow-elevated border p-1"
          >
            <Button
              variant={mobileView === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setMobileView('list')}
            >
              <List className="h-4 w-4" />
              List
            </Button>
            <Button
              variant={mobileView === 'map' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full gap-2"
              onClick={() => setMobileView('map')}
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
          </motion.div>
        </div>

        {/* List View */}
        <div 
          className={cn(
            "w-full lg:w-[45%] xl:w-[40%] bg-background border-r",
            mobileView === 'map' && "hidden lg:block"
          )}
        >
          <div className="p-3 sm:p-4 border-b flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{sortedRestaurants.length}</span> restaurants found
            </p>
          </div>

          <div className="h-[calc(100vh-14rem)] sm:h-[calc(100vh-13rem)] overflow-hidden">
            {isLoading ? (
              <div className="p-3 sm:p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border p-4 space-y-3">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <Virtuoso
                ref={virtuosoRef}
                data={sortedRestaurants}
                itemContent={(index, restaurant) => (
                  <div 
                    className="p-3 sm:p-4"
                    onMouseEnter={() => setHoveredRestaurantId(restaurant.id)}
                    onMouseLeave={() => setHoveredRestaurantId(null)}
                  >
                    <RestaurantCard
                      restaurant={restaurant}
                      isHighlighted={highlightedCardId === restaurant.id || selectedRestaurantId === restaurant.id}
                      onSelect={handleCardSelect}
                      onFavorite={toggleFavorite}
                      isFavorited={isInFavorites(restaurant.id)}
                    />
                  </div>

                )}
                className="scrollbar-thin"
              />
            )}
          </div>
        </div>

        {/* Map View - Full height on mobile with explicit dimensions */}
        <div 
          className={cn(
            "flex-1 min-h-[400px] h-[calc(100vh-11rem)] sm:h-[calc(100vh-10rem)]",
            mobileView === 'list' ? "hidden lg:block" : "block"
          )}
          style={{ width: '100%' }}
        >
          {(mobileView === 'map' || !isMobile) && (
            <Suspense fallback={<div className="flex items-center justify-center h-full bg-muted"><Skeleton className="w-full h-full" /></div>}>
              <RestaurantMap
                restaurants={mapRestaurants}
                selectedId={selectedRestaurantId}
                hoveredId={hoveredRestaurantId}
                onMarkerClick={handleMarkerClick}
                onBoundsChange={handleBoundsChange}
                center={mapCenter}
                onNavigateToRestaurant={handleCardSelect}
                isMobile={isMobile}
              />
            </Suspense>
          )}

        </div>
      </div>
    </div>
  );
};

export default Explore;