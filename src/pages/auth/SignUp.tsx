import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "use-debounce";

const SignUp = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, checkUsernameUnique } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [debouncedUsername] = useDebounce(formData.username, 500);

  useEffect(() => {
    const checkUsername = async () => {
      if (debouncedUsername.length > 3) {
        setIsUsernameChecking(true);
        const isUnique = await checkUsernameUnique(debouncedUsername);
        setIsUsernameValid(isUnique);
        setUsernameMessage(isUnique ? "Username is available!" : "Username is already taken.");
        setIsUsernameChecking(false);
      } else {
        setIsUsernameValid(false);
        setUsernameMessage("Username must be at least 4 characters long.");
      }
    };

    if (debouncedUsername) {
      checkUsername();
    } else {
      setIsUsernameValid(false);
      setUsernameMessage("");
    }
  }, [debouncedUsername, checkUsernameUnique]);

  const passwordRequirements = [
    { text: "At least 8 characters", met: formData.password.length >= 8 },
    { text: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { text: "One number", met: /[0-9]/.test(formData.password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signUp(formData.email, formData.password, formData.username);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Account created!",
      description: "Please check your email to confirm your account.",
    });
    setIsLoading(false);
    navigate(`/auth/confirm-email?email=${formData.email}`);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:block lg:w-1/2 xl:w-2/5 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-primary-foreground">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-display text-4xl font-bold mb-4">
                Join the<br />Community
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-sm mx-auto">
                Create an account to save your favorites, write reviews, and submit new restaurants.
              </p>
            </motion.div>
          </div>
        </div>
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full bg-white/5" />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 xl:px-24">
        <div className="max-w-md w-full mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-8 -ml-2 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <img src="/HB_LOGO.svg" alt="HalalBytes Logo" className="w-10 h-10" />
              <span className="font-display font-bold text-2xl text-foreground">HalalBytes</span>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-muted-foreground mb-8">
              Join the Muslim community in discovering halal food
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    className="h-12 pr-12"
                  />
                  {isUsernameChecking ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : formData.username.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isUsernameValid ? (
                        <Check className="h-5 w-5 text-halal-full" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {usernameMessage && (
                  <p className={`text-sm ${isUsernameValid ? "text-halal-full" : "text-destructive"}`}>
                    {usernameMessage}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-12 w-12"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {/* Password Requirements */}
                <div className="pt-2 space-y-1">
                  {passwordRequirements.map((req, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-sm ${req.met ? 'text-halal-full' : 'text-muted-foreground'}`}
                    >
                      <Check className={`h-3.5 w-3.5 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                      {req.text}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 btn-glow"
                disabled={isLoading || !isUsernameValid || !passwordRequirements.every(r => r.met)}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>

            <p className="text-center text-muted-foreground mt-8">
              Already have an account?{" "}
              <Link to="/auth/signin" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
