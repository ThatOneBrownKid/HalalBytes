import { useState, useRef, useCallback, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// --- Interfaces for Places API (New) ---

interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  priceLevel?: number;
  openingHours?: string[];
  placeId: string;
  description?: string;
  cuisineType?: string;
  types?: string[];
  photos?: string[];
}

interface PlacePrediction {
  placeId: string;
  text: {
    text: string;
  };
  structuredFormat: {
    mainText: {
      text: string;
    };
    secondaryText?: {
      text: string;
    };
  };
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceDetails) => void;
  onPhotosFound?: (photoUrls: string[]) => void;
  placeholder?: string;
  className?: string;
  query: string;
  onQueryChange: (query: string) => void;
}

// Generate a unique session token for cost optimization
const generateSessionToken = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

import { getCustomCategory } from "@/utils/categoryTagger";
import { cuisineTypeMap } from "@/lib/cuisineTypeMap";

export const GooglePlacesAutocomplete = ({
  onPlaceSelect,
  placeholder = "Search for a restaurant...",
  className,
  query,
  onQueryChange,
}: GooglePlacesAutocompleteProps) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<string>("");
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFocus = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateSessionToken();
    }
    setIsFocused(true);
    setError(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setPredictions([]);
      return;
    }
    if (!MAPS_API_KEY) {
      setError("Google Maps API key not configured.");
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': MAPS_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['restaurant'],
          sessionToken: sessionTokenRef.current,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Places API (New) Autocomplete Error:", data);
        throw new Error(data.error?.message || "Failed to fetch predictions.");
      }
      
      setPredictions(data.suggestions?.map((s: any) => s.placePrediction) || []);

    } catch (err: any) {
      console.error("Places autocomplete error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    onQueryChange(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  
    const handleSelectPlace = async (prediction: PlacePrediction) => {
      onQueryChange(prediction.structuredFormat.mainText.text);
      setPredictions([]);
      setIsFocused(false);
      setIsLoading(true);
  
      try {
        if (!MAPS_API_KEY) {
          throw new Error("Google Maps API key not configured.");
        }
  
        // Request generativeSummary for description
        const fields = "id,displayName,formattedAddress,location,internationalPhoneNumber,websiteUri,priceLevel,regularOpeningHours,generativeSummary,editorialSummary,primaryType,types,photos";
        const params = new URLSearchParams({
          sessionToken: sessionTokenRef.current,
        });
  
        const response = await fetch(`https://places.googleapis.com/v1/places/${prediction.placeId}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': MAPS_API_KEY,
            'X-Goog-FieldMask': fields,
          },
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          console.error("Places API (New) Details Error:", data);
          throw new Error(data.error?.message || "Failed to fetch place details.");
        }
        
        // console.log("Places API (New) Details Response:", data);
  
        // Parse price level from string like "PRICE_LEVEL_MODERATE" to number
        const priceLevelMap: Record<string, number> = {
          'PRICE_LEVEL_FREE': 0,
          'PRICE_LEVEL_INEXPENSIVE': 1,
          'PRICE_LEVEL_MODERATE': 2,
          'PRICE_LEVEL_EXPENSIVE': 3,
          'PRICE_LEVEL_VERY_EXPENSIVE': 4,
        };
  
        // Get cuisine type using the custom tagger first
        let cuisineType = getCustomCategory(data);
  
        // Fallback to existing logic if no custom category is found
        if (!cuisineType) {
          if (data.primaryType && cuisineTypeMap[data.primaryType]) {
            cuisineType = cuisineTypeMap[data.primaryType];
          } else if (data.types) {
            for (const type of data.types) {
              if (cuisineTypeMap[type]) {
                cuisineType = cuisineTypeMap[type];
                break;
              }
            }
          }
        }
        
        // Get description from generativeSummary first, then editorialSummary
        let description: string | undefined;
        if (data.generativeSummary?.overview?.text) {
          description = data.generativeSummary.overview.text;
        } else if (data.generativeSummary?.description?.text) {
          description = data.generativeSummary.description.text;
        } else if (data.editorialSummary?.text) {
          description = data.editorialSummary.text;
        }
  
        // Get photo URLs directly from Google Places API
        const photoUrls = data.photos?.slice(0, 5).map((photo: any) => 
          `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=1200&key=${MAPS_API_KEY}`
        ) || [];
  
        // Parse display name correctly
        const name = typeof data.displayName === 'object' && data.displayName?.text 
          ? data.displayName.text 
          : typeof data.displayName === 'string' 
            ? data.displayName 
            : prediction.structuredFormat.mainText.text;
  
        onPlaceSelect({
          placeId: data.id || prediction.placeId,
          name,
          address: data.formattedAddress,
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0,
          phone: data.internationalPhoneNumber,
          website: data.websiteUri,
          priceLevel: data.priceLevel ? priceLevelMap[data.priceLevel] || 2 : undefined,
          openingHours: data.regularOpeningHours?.weekdayDescriptions,
          description,
          cuisineType,
          types: data.types,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
        });
  
        // Reset session token for the next "session"
        sessionTokenRef.current = "";
  
      } catch (err: any) {
        console.error("Place details error:", err);
        setError(err.message);
         // Fallback with basic info
         onPlaceSelect({
          placeId: prediction.placeId,
          name: prediction.structuredFormat.mainText.text,
          address: prediction.structuredFormat.secondaryText?.text || prediction.text.text,
          lat: 0,
          lng: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };
  
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {isFocused && (predictions.length > 0 || error) && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
          {error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : (
            predictions.map((p) => (
              <button
                key={p.placeId}
                type="button"
                onClick={() => handleSelectPlace(p)}
                className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium text-sm">
                    {p.structuredFormat.mainText.text}
                  </div>
                  {p.structuredFormat.secondaryText && (
                    <div className="text-xs text-muted-foreground">
                      {p.structuredFormat.secondaryText.text}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};