import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface Filters {
  priceRange: string[];
  cuisineTypes: string[];
  halalStatus: string[];
  openNow: boolean;
  distance: number;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const priceOptions = ['$', '$$', '$$$', '$$$$'];
const cuisineOptions = [
  'American', 
  'Middle Eastern', 
  'South Asian', 
  'Turkish', 
  'Mediterranean', 
  'Asian', 
  'Halal',
  'Seafood',
  'Fast Food',
  'BBQ',
  'African',
  'Caribbean',
  'Latin American'
];
const halalOptions = ['Full Halal', 'Partial Halal'];
const distanceMarks = [5, 10, 25, 50];

export const FilterBar = ({ filters, onFiltersChange }: FilterBarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const activeFiltersCount = 
    filters.priceRange.length + 
    filters.cuisineTypes.length + 
    filters.halalStatus.length + 
    (filters.openNow ? 1 : 0) +
    (filters.distance !== 50 ? 1 : 0);

  const toggleFilter = (category: 'priceRange' | 'cuisineTypes' | 'halalStatus', value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const applyFilters = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: Filters = {
      priceRange: [],
      cuisineTypes: [],
      halalStatus: [],
      openNow: false,
      distance: 50
    };
    setTempFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const removeFilter = (category: 'priceRange' | 'cuisineTypes' | 'halalStatus', value: string) => {
    const newFilters = {
      ...filters,
      [category]: filters[category].filter(v => v !== value)
    };
    onFiltersChange(newFilters);
    setTempFilters(newFilters);
  };

  const toggleOpenNow = () => {
    const newFilters = { ...filters, openNow: !filters.openNow };
    onFiltersChange(newFilters);
    setTempFilters(newFilters);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filter Button & Quick Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">Filters</SheetTitle>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Open Now Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="open-now" className="font-medium">Open Now</Label>
                  <p className="text-xs text-muted-foreground">Only show currently open restaurants</p>
                </div>
                <Switch
                  id="open-now"
                  checked={tempFilters.openNow}
                  onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, openNow: checked }))}
                />
              </div>

              <Separator />

              {/* Distance Filter */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Distance</h3>
                  <span className="text-sm text-muted-foreground">
                    {tempFilters.distance === 50 ? "50+ mi" : `${tempFilters.distance} mi`}
                  </span>
                </div>
                <div className="px-2">
                  <Slider
                    value={[tempFilters.distance]}
                    onValueChange={(value) => setTempFilters(prev => ({ ...prev, distance: value[0] }))}
                    min={5}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>5 mi</span>
                    <span>25 mi</span>
                    <span>50+ mi</span>
                  </div>
                </div>
              </div>

              <Separator />
              <div>
                <h3 className="font-medium mb-3">Price Range</h3>
                <div className="flex gap-2 flex-wrap">
                  {priceOptions.map((price) => (
                    <Button
                      key={price}
                      variant={tempFilters.priceRange.includes(price) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFilter('priceRange', price)}
                      className="min-w-[3rem]"
                    >
                      {price}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Halal Status */}
              <div>
                <h3 className="font-medium mb-3">Halal Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {halalOptions.map((status) => (
                    <Button
                      key={status}
                      variant={tempFilters.halalStatus.includes(status) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFilter('halalStatus', status)}
                      className={cn(
                        tempFilters.halalStatus.includes(status) && 
                        status === 'Full Halal' && "bg-halal-full hover:bg-halal-full/90",
                        tempFilters.halalStatus.includes(status) && 
                        status === 'Partial Halal' && "bg-halal-partial hover:bg-halal-partial/90 text-halal-partial-foreground"
                      )}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cuisine Types */}
              <div>
                <h3 className="font-medium mb-3">Cuisine</h3>
                <div className="grid grid-cols-2 gap-2">
                  {cuisineOptions.map((cuisine) => (
                    <div key={cuisine} className="flex items-center space-x-2">
                      <Checkbox
                        id={cuisine}
                        checked={tempFilters.cuisineTypes.includes(cuisine)}
                        onCheckedChange={() => toggleFilter('cuisineTypes', cuisine)}
                      />
                      <Label htmlFor={cuisine} className="text-sm cursor-pointer">
                        {cuisine}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <SheetFooter className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Quick filter chips for active filters */}
        <AnimatePresence>
          {filters.distance !== 50 && (
            <motion.div
              key="distance"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer pr-1.5"
                onClick={() => {
                  const newFilters = { ...filters, distance: 50 };
                  onFiltersChange(newFilters);
                  setTempFilters(newFilters);
                }}
              >
                <MapPin className="h-3 w-3" />
                {filters.distance} mi
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          )}
          {filters.openNow && (
            <motion.div
              key="open-now"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer pr-1.5 bg-halal-full/20 text-halal-full border-halal-full/30"
                onClick={toggleOpenNow}
              >
                <Clock className="h-3 w-3" />
                Open Now
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          )}
          {filters.halalStatus.map((status) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className={cn(
                  "gap-1 cursor-pointer pr-1.5",
                  status === 'Full Halal' && "bg-halal-full/20 text-halal-full border-halal-full/30",
                  status === 'Partial Halal' && "bg-halal-partial/20 text-halal-partial border-halal-partial/30"
                )}
                onClick={() => removeFilter('halalStatus', status)}
              >
                {status}
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          ))}
          {filters.priceRange.map((price) => (
            <motion.div
              key={price}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer pr-1.5"
                onClick={() => removeFilter('priceRange', price)}
              >
                {price}
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          ))}
          {filters.cuisineTypes.map((cuisine) => (
            <motion.div
              key={cuisine}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer pr-1.5"
                onClick={() => removeFilter('cuisineTypes', cuisine)}
              >
                {cuisine}
                <X className="h-3 w-3" />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
