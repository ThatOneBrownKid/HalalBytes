import { useState, lazy, Suspense } from "react";
import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the map
const RestaurantMap = lazy(() => import("@/components/map/RestaurantMap").then(m => ({ default: m.RestaurantMap })));

interface LocationMapLinkProps {
  lat: number;
  lng: number;
  address: string;
  name:string;
}

export const LocationMapLink = ({ lat, lng, address, name }: LocationMapLinkProps) => {
  const [showMapOptions, setShowMapOptions] = useState(false);

  const encodedAddress = encodeURIComponent(address);
  const encodedName = encodeURIComponent(name);

  const mapLinks = {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedAddress}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${encodedName}`,
  };

  const handleClick = () => {
    // Always show the dialog on click now
    setShowMapOptions(true);
  };

  const openMap = (service: "google" | "apple" | "waze") => {
    window.open(mapLinks[service], "_blank");
    setShowMapOptions(false);
  };
  
  // Create a minimal restaurant object for the map
  const mapRestaurant = {
    id: address, // Using address as a unique enough ID for this context
    name: name,
    lat: lat,
    lng: lng,
    halal_status: 'Full Halal' as const, // Default value
    is_sponsored: false, // Default value
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="relative w-full h-48 rounded-xl overflow-hidden cursor-pointer group border"
      >
        <Suspense fallback={<Skeleton className="w-full h-full" />}>
          <RestaurantMap
            restaurants={[mapRestaurant]}
            center={{ lat, lng }}
            zoom={15}
            isMobile={false} // Force desktop popups for this single view
          />
        </Suspense>
        
        {/* Overlay with directions button */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button className="gap-2 pointer-events-none shadow-md">
            <Navigation className="h-4 w-4" />
            Get Directions
          </Button>
        </div>
      </div>

      {/* Mobile map service selection dialog */}
      <Dialog open={showMapOptions} onOpenChange={setShowMapOptions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Get Directions</DialogTitle>
            <DialogDescription>
              Choose your preferred map app
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => openMap("google")}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                 <img src="/Maps/Google-Maps.svg" alt="Google Maps" className="w-8 h-8" />
              </div>
              <div className="text-left">
                <div className="font-medium">Google Maps</div>
                <div className="text-xs text-muted-foreground">Navigate with Google</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => openMap("apple")}
            >
               <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <img src="/Maps/Apple-Maps.svg" alt="Apple Maps" className="w-8 h-8" />
              </div>
              <div className="text-left">
                <div className="font-medium">Apple Maps</div>
                <div className="text-xs text-muted-foreground">Navigate with Apple</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => openMap("waze")}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <img src="/Maps/Waze-Maps.svg" alt="Waze" className="w-8 h-8" />
              </div>
              <div className="text-left">
                <div className="font-medium">Waze</div>
                <div className="text-xs text-muted-foreground">Navigate with Waze</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
