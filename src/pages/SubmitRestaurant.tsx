import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, MapPin, Phone, Globe, Search, PenLine, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadZone } from "@/components/forms/ImageUploadZone";
import { GooglePlacesAutocomplete } from "@/components/forms/GooglePlacesAutocomplete";
import { OpeningHoursEditor, getDefaultOpeningHours, parseGoogleHours, type OpeningHoursData } from "@/components/forms/OpeningHoursEditor";
import { geocodeAddress } from "@/utils/geocoding";

interface UploadedImage {
  id: string;
  url: string;
  file?: File;
  isUploading?: boolean;
}

const meatTypes = [
  { id: "chicken", label: "Chicken" },
  { id: "beef", label: "Beef" },
  { id: "lamb", label: "Lamb" },
  { id: "goat", label: "Goat" },
];

const consolidatedCuisineTypes = [
  "African",
  "American",
  "Asian Fusion",
  "Bakery",
  "Breakfast",
  "Burgers",
  "Cafe",
  "Dessert",
  "East Asian",
  "European",
  "Fast Food",
  "Latin American",
  "Middle Eastern",
  "Pizza",
  "Sandwiches",
  "Seafood",
  "South Asian",
  "Southeast Asian",
  "Steakhouse",
  "Vegetarian",
].sort();

const uploadGooglePhoto = async (url: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const fileName = `submissions/google-${Date.now()}-${Math.random()}.${ext}`;
    
    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, blob);
      
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(fileName);
      
    return { url: data.publicUrl, path: fileName };
  } catch (error) {
    console.error('Error uploading Google photo:', error);
    return null;
  }
};

const SubmitRestaurant = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryMode, setEntryMode] = useState<"search" | "manual">("search");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [duplicateStatus, setDuplicateStatus] = useState<{ type: 'existing' | 'pending', id?: string } | null>(null);
  const [cuisineError, setCuisineError] = useState<string | null>(null);

  // Track uploaded Google images to clean up if form is abandoned
  const googleImagePathsRef = useRef<string[]>([]);
  const isSubmittedRef = useRef(false);

  // Cleanup on unmount if not submitted
  useEffect(() => {
    return () => {
      if (!isSubmittedRef.current && googleImagePathsRef.current.length > 0) {
        // Delete all uploaded Google images if the user leaves without submitting
        supabase.storage.from('restaurant-images').remove(googleImagePathsRef.current);
      }
    };
  }, []);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    website_url: "",
    cuisine_type: "",
    price_range: "$$" as "$" | "$$" | "$$$" | "$$$$",
    halal_status: "Full Halal" as "Full Halal" | "Partial Halal",
    partial_halal_meats: [] as string[],
    lat: 0,
    lng: 0,
    opening_hours: getDefaultOpeningHours(),
  });

    const handleInputChange = (field: string, value: any) => {

      setFormData(prev => ({ ...prev, [field]: value }));

    };


  // Check for duplicates when name or address changes
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!formData.name || !formData.address) {
        setDuplicateStatus(null);
        return;
      }

      // Check existing restaurants
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .ilike('name', formData.name)
        .ilike('address', formData.address)
        .maybeSingle();

      if (existing) {
        setDuplicateStatus({ type: 'existing', id: existing.id });
        return;
      }

      // Check pending requests
      const { data: pending } = await supabase
        .from('restaurant_requests')
        .select('id')
        .eq('status', 'pending')
        .ilike('submission_data->>name', formData.name)
        .ilike('submission_data->>address', formData.address)
        .maybeSingle();

      if (pending) {
        setDuplicateStatus({ type: 'pending' });
        return;
      }

      setDuplicateStatus(null);
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.name, formData.address]);

  const handleMeatToggle = (meatId: string) => {
    setFormData(prev => ({
      ...prev,
      partial_halal_meats: prev.partial_halal_meats.includes(meatId)
        ? prev.partial_halal_meats.filter(m => m !== meatId)
        : [...prev.partial_halal_meats, meatId]
    }));
  };

  const handlePlaceSelect = async (place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone?: string;
    website?: string;
    priceLevel?: number;
    openingHours?: string[];
    description?: string;
    cuisineType?: string;
    types?: string[];
    photos?: string[];
  }) => {
    // Reset form data and images
    setFormData({
      name: "",
      description: "",
      address: "",
      phone: "",
      website_url: "",
      cuisine_type: "",
      price_range: "$$" as "$" | "$$" | "$$$" | "$$$$",
      halal_status: "Full Halal" as "Full Halal" | "Partial Halal",
      partial_halal_meats: [] as string[],
      lat: 0,
      lng: 0,
      opening_hours: getDefaultOpeningHours(),
    });
    setImages([]);
    setSearchQuery("");
    setCuisineError(null);

    const priceMap: Record<number, "$" | "$$" | "$$$" | "$$$$"> = {
      1: "$",
      2: "$$",
      3: "$$$",
      4: "$$$$",
    };

    // Robust Cuisine Detection
    let matchedCuisine = "";
    
    const cuisineMapping: Record<string, string> = {
      "Yemeni": "Middle Eastern",
      "Lebanese": "Middle Eastern",
      "Turkish": "Middle Eastern",
      "Persian": "Middle Eastern",
      "Iranian": "Middle Eastern",
      "Afghan": "Middle Eastern",
      "Syrian": "Middle Eastern",
      "Iraqi": "Middle Eastern",
      "Egyptian": "Middle Eastern",
      "Palestinian": "Middle Eastern",
      "Jordanian": "Middle Eastern",
      "Saudi": "Middle Eastern",
      "Kuwaiti": "Middle Eastern",
      "Emirati": "Middle Eastern",
      "Pakistani": "South Asian",
      "Indian": "South Asian",
      "Bangladeshi": "South Asian",
      "Sri Lankan": "South Asian",
      "Nepali": "South Asian",
      "Mexican": "Latin American",
      "Brazilian": "Latin American",
      "Peruvian": "Latin American",
      "Argentinian": "Latin American",
      "Colombian": "Latin American",
      "Venezuelan": "Latin American",
      "Cuban": "Latin American",
      "Ethiopian": "African",
      "Somali": "African",
      "Nigerian": "African",
      "Eritrean": "African",
      "Ghanaian": "African",
      "Senegalese": "African",
      "Moroccan": "Middle Eastern",
      "Tunisian": "Middle Eastern",
      "Algerian": "Middle Eastern",
      "Libyan": "Middle Eastern",
      "Sudanese": "African",
      "Chinese": "East Asian",
      "Japanese": "East Asian",
      "Korean": "East Asian",
      "Vietnamese": "Southeast Asian",
      "Thai": "Southeast Asian",
      "Filipino": "Southeast Asian",
      "Indonesian": "Southeast Asian",
      "Malaysian": "Southeast Asian",
      "Singaporean": "Southeast Asian",
      "Italian": "European",
      "French": "European",
      "Spanish": "European",
      "German": "European",
      "Greek": "European",
      "Mediterranean": "Middle Eastern",
    };

    const normalizeType = (type: string) => {
      return type
        .replace(/_restaurant$/, '')
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    const checkCuisine = (type: string) => {
      // 1. Check mapping first (priority to consolidation)
      if (cuisineMapping[type] && consolidatedCuisineTypes.includes(cuisineMapping[type])) {
        return cuisineMapping[type];
      }
      
      // 2. Check direct match
      if (consolidatedCuisineTypes.includes(type)) return type;

      // 3. Case insensitive match
      const found = consolidatedCuisineTypes.find(c => c.toLowerCase() === type.toLowerCase());
      if (found) return found;

      return null;
    };

    if (place.cuisineType) {
      matchedCuisine = checkCuisine(place.cuisineType) || "";
    }

    if (!matchedCuisine && place.types) {
      for (const type of place.types) {
        const normalized = normalizeType(type);
        const found = checkCuisine(normalized);
        if (found) {
          matchedCuisine = found;
          break;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      phone: place.phone || prev.phone,
      website_url: place.website || prev.website_url,
      price_range: place.priceLevel ? priceMap[place.priceLevel] || "$$" : prev.price_range,
      opening_hours: place.openingHours ? parseGoogleHours(place.openingHours) : prev.opening_hours,
      description: place.description || prev.description,
      cuisine_type: matchedCuisine,
    }));

    // Add Google Photo URLs directly to the images state
    if (place.photos && place.photos.length > 0) {
      const photosToProcess = place.photos.slice(0, 5);
      toast.info(`Processing ${photosToProcess.length} photos from Google...`);
      
      const processedPhotos: UploadedImage[] = [];
      let failedCount = 0;

      // Process sequentially to avoid rate limits and ensure successful uploads
      for (const url of photosToProcess) {
        const result = await uploadGooglePhoto(url);
        if (result) {
          googleImagePathsRef.current.push(result.path);
          processedPhotos.push({
            id: `google-${Date.now()}-${Math.random()}`,
            url: result.url,
            isUploading: false,
          });
        } else {
          failedCount++;
        }
        // Small delay to be gentle on APIs
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setImages(prev => [...prev, ...processedPhotos]);
      
      if (failedCount > 0) {
        toast.warning(`Added ${processedPhotos.length} photos. ${failedCount} failed to upload.`);
      } else {
        toast.success(`Added ${processedPhotos.length} photos.`);
      }
    }

    toast.success("Restaurant details filled from search");
    
    if (!matchedCuisine) {
      setCuisineError("Could not auto-detect cuisine. Please select the best match.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicateStatus) {
      if (duplicateStatus.type === 'existing') {
        toast.error("This restaurant is already listed.");
      } else {
        toast.error("A submission for this restaurant is already under review.");
      }
      return;
    }
    
    if (!user) {
      toast.error("Please sign in to submit a restaurant");
      return;
    }

    if (!formData.name || !formData.address || !formData.cuisine_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if any images are still uploading
    if (images.some(img => img.isUploading)) {
      toast.error("Please wait for all images to finish uploading");
      return;
    }

    setIsSubmitting(true);

    try {
      // Geocode the address if coordinates are not set
      let lat = formData.lat;
      let lng = formData.lng;
      
      if (lat === 0 && lng === 0 && formData.address) {
        const geocoded = await geocodeAddress(formData.address);
        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
        }
      }

      // Get image URLs
      const imageUrls = images
        .filter(img => !img.isUploading && img.url)
        .map(img => img.url);

      const submissionData = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        phone: formData.phone,
        website_url: formData.website_url,
        cuisine_type: formData.cuisine_type,
        price_range: formData.price_range,
        halal_status: formData.halal_status,
        partial_halal_meats: formData.halal_status === "Partial Halal" ? formData.partial_halal_meats : [],
        image_urls: imageUrls,
        lat,
        lng,
        opening_hours: formData.opening_hours,
      };

      const { error } = await supabase
        .from('restaurant_requests')
        .insert([{
          user_id: user.id,
          submission_data: submissionData as any,
          status: 'pending' as const,
        }]);

      if (error) throw error;

      isSubmittedRef.current = true;

      // Clean up any Google images that were uploaded but not used in the final submission
      const currentImageUrls = new Set(imageUrls);
      const unusedPaths = googleImagePathsRef.current.filter(path => 
        !currentImageUrls.has(supabase.storage.from('restaurant-images').getPublicUrl(path).data.publicUrl)
      );
      
      if (unusedPaths.length > 0) {
        supabase.storage.from('restaurant-images').remove(unusedPaths);
      }

      toast.success("Restaurant submitted for review!", {
        description: "You can track its status in My Requests"
      });
      
      setSearchQuery("");
      navigate('/my-requests');
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error("Failed to submit restaurant", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Submit a Restaurant</CardTitle>
              <CardDescription>
                Help the community discover halal restaurants in your area. 
                Submissions are reviewed by our team before being published.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {duplicateStatus?.type === 'existing' && (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Restaurant already exists</AlertTitle>
                    <AlertDescription className="mt-2">
                      This restaurant is already in our directory. 
                      <Button variant="link" className="p-0 h-auto font-semibold ml-1 text-yellow-700" onClick={() => navigate(`/restaurant/${duplicateStatus.id}`)} type="button">
                        View Restaurant <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {duplicateStatus?.type === 'pending' && (
                  <Alert className="border-blue-500/50 bg-blue-500/10 text-blue-600">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Submission under review</AlertTitle>
                    <AlertDescription>
                      Someone has already submitted this restaurant. We are currently reviewing it.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Entry Mode Toggle */}
                <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "search" | "manual")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="search" className="gap-2">
                      <Search className="h-4 w-4" />
                      Search to Auto-fill
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2">
                      <PenLine className="h-4 w-4" />
                      Manual Entry
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="search" className="mt-4">
                    <div className="space-y-2">
                      <Label>Search for Restaurant</Label>
                      <GooglePlacesAutocomplete
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        onPlaceSelect={handlePlaceSelect}
                        placeholder="Search by restaurant name or address..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Search will auto-fill name, address, phone, website, hours, and price range.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4">
                    <p className="text-sm text-muted-foreground">
                      Fill in all restaurant details manually below.
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Restaurant Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter restaurant name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell us about this restaurant..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cuisine_type">Cuisine Type *</Label>
                      {cuisineError && (
                        <p className="text-sm text-destructive font-medium animate-pulse">
                          {cuisineError}
                        </p>
                      )}
                      <Select
                        value={formData.cuisine_type}
                        onValueChange={(value) => {
                          handleInputChange("cuisine_type", value);
                          setCuisineError(null);
                        }}
                      >
                        <SelectTrigger className={cuisineError ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select cuisine type" />
                        </SelectTrigger>
                        <SelectContent>
                          {consolidatedCuisineTypes.map(cuisine => (
                            <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_range">Price Range</Label>
                      <Select
                        value={formData.price_range}
                        onValueChange={(value) => handleInputChange("price_range", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="$">$ - Budget</SelectItem>
                          <SelectItem value="$$">$$ - Moderate</SelectItem>
                          <SelectItem value="$$$">$$$ - Upscale</SelectItem>
                          <SelectItem value="$$$$">$$$$ - Fine Dining</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Location & Contact</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="address"
                        placeholder="Full street address (will be geocoded)"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Address will be automatically converted to map coordinates
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          placeholder="https://example.com"
                          value={formData.website_url}
                          onChange={(e) => handleInputChange("website_url", e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opening Hours */}
                <OpeningHoursEditor
                  value={formData.opening_hours}
                  onChange={(hours) => setFormData(prev => ({ ...prev, opening_hours: hours }))}
                />

                {/* Halal Status */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Halal Information</h3>
                  
                  <div className="space-y-2">
                    <Label>Halal Status *</Label>
                    <Select
                      value={formData.halal_status}
                      onValueChange={(value) => handleInputChange("halal_status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full Halal">Full Halal - Entire menu is halal</SelectItem>
                        <SelectItem value="Partial Halal">Partial Halal - Some halal options</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.halal_status === "Partial Halal" && (
                    <div className="space-y-2">
                      <Label>Halal Meat Types Available</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {meatTypes.map(meat => (
                          <div
                            key={meat.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={meat.id}
                              checked={formData.partial_halal_meats.includes(meat.id)}
                              onCheckedChange={() => handleMeatToggle(meat.id)}
                            />
                            <Label htmlFor={meat.id} className="cursor-pointer text-sm">
                              {meat.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Image Upload */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Restaurant Images (up to 10)</h3>
                  <ImageUploadZone
                    images={images}
                    onImagesChange={setImages}
                    maxImages={10}
                    folderPrefix="submissions"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Submit for Review
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By submitting, you confirm that the information provided is accurate to the best of your knowledge.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default SubmitRestaurant;
