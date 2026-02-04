import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Save, Loader2, AlertTriangle, Trash2 } from "lucide-react";

// Helper to convert file to base64 data URI
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(profile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const deleteImageFromStorage = async (url: string) => {
    try {
      if (!url || !url.includes('restaurant-images')) return;
      const path = url.split('/restaurant-images/')[1];
      if (path) {
        await supabase.storage.from('restaurant-images').remove([path]);
      }
    } catch (error) {
      console.error("Error deleting old image:", error);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async ({ username, avatar_url }: { username: string; avatar_url: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      if (profile?.avatar_url && profile.avatar_url !== avatar_url) {
        await deleteImageFromStorage(profile.avatar_url);
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ username, avatar_url: avatar_url || null })
        .eq("user_id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      if(data) {
        updateProfile(data);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploading(true);
    setModerationError(null);

    try {
      const imageBase64 = await fileToBase64(file);
      
      const response = await fetch('/moderate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && !result.data.safe) {
          setModerationError(result.data.reason || 'This image violates our community guidelines.');
          setIsUploading(false);
          return;
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      const newAvatarUrl = urlData.publicUrl;
      setAvatarUrl(newAvatarUrl);
      updateProfile({ avatar_url: newAvatarUrl });

      // If not in editing mode, save immediately.
      if (!isEditing) {
        if (profile?.avatar_url) {
          await deleteImageFromStorage(profile.avatar_url);
        }
        await supabase
          .from("profiles")
          .update({ avatar_url: newAvatarUrl })
          .eq("user_id", user.id);
        toast.success("Avatar updated!");
      } else {
        if (avatarUrl && avatarUrl !== profile?.avatar_url) {
          await deleteImageFromStorage(avatarUrl);
        }
        toast.info("Avatar changed. Click 'Save Changes' to keep it.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user) return;

    const oldAvatarUrl = avatarUrl;
    setAvatarUrl(""); 
    updateProfile({ avatar_url: null });

    if (!isEditing) {
      if (!profile?.avatar_url) return;
      
      if (window.confirm("Are you sure you want to remove your profile picture?")) {
        await deleteImageFromStorage(profile.avatar_url);
        
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: null })
          .eq("user_id", user.id);
          
        if (error) {
          toast.error("Failed to remove avatar");
          setAvatarUrl(oldAvatarUrl); // Revert UI on error
          updateProfile({ avatar_url: oldAvatarUrl });
          return;
        }
        
        toast.success("Avatar removed");
      } else {
        setAvatarUrl(oldAvatarUrl); // Revert if user cancels
        updateProfile({ avatar_url: oldAvatarUrl });
      }
    } else {
      if (oldAvatarUrl && oldAvatarUrl !== profile?.avatar_url) {
        await deleteImageFromStorage(oldAvatarUrl);
      }
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate({ username, avatar_url: avatarUrl });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-10 w-48 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    navigate("/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          My Profile
        </h1>

        <Card>
          {moderationError && (
            <div className="p-4 pb-0">
              <Alert variant="destructive" className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <AlertDescription>{moderationError}</AlertDescription>
              </Alert>
            </div>
          )}
          
          <CardHeader className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              <Avatar className="w-24 h-24 ring-4 ring-primary/10">
                <AvatarImage src={avatarUrl || undefined} alt={username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {username?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`absolute inset-0 rounded-full bg-foreground/60 flex items-center justify-center transition-opacity cursor-pointer z-10 ${
                  isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-background animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-background" />
                )}
              </button>

              {avatarUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAvatar();
                  }}
                  disabled={isUploading}
                  className="absolute -top-1 -right-1 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90 z-20"
                  title="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <CardTitle className="font-display text-xl">{username || "User"}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Hover over avatar to upload a new photo
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false);
                      setUsername(profile?.username || "");
                      setAvatarUrl(profile?.avatar_url || "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button className="w-full" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;