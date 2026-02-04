import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MapDirectionButtonsProps {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
}

export const MapDirectionButtons = ({ lat, lng, name, className }: MapDirectionButtonsProps) => {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const appleMapsUrl = `http://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(name || "Restaurant")}`;
  const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 flex-1 sm:flex-none"
        onClick={() => window.open(googleMapsUrl, '_blank')}
      >
        <img src="/Maps/Google-Maps.svg" alt="Google Maps" className="h-4 w-4" />
        Google Maps
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        className="gap-2 flex-1 sm:flex-none"
        onClick={() => window.open(appleMapsUrl, '_blank')}
      >
        <img src="/Maps/Apple-Maps.svg" alt="Apple Maps" className="h-4 w-4" />
        Apple Maps
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 flex-1 sm:flex-none"
        onClick={() => window.open(wazeUrl, '_blank')}
      >
        <img src="/Maps/Waze-Maps.svg" alt="Waze" className="h-4 w-4" />
        Waze
      </Button>
    </div>
  );
};