import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ConfirmEmail = () => {
  const { resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [location.search]);

  const handleResend = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resendConfirmationEmail(email);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "A new confirmation email has been sent.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center bg-card p-8 rounded-lg shadow-lg"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-primary rounded-full p-4">
            <Mail className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground mb-4">
          Confirm your email
        </h1>
        <p className="text-muted-foreground mb-8">
          We've sent a confirmation link to <strong>{email}</strong>. Please check your inbox (and spam folder!) to complete the sign-up process.
        </p>
        <div className="flex flex-col gap-4">
          <Button asChild variant="outline">
            <Link to="/auth/signin">
              Back to Sign In
            </Link>
          </Button>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          <p>
            Didn't receive the email?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-primary"
              onClick={handleResend}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                "Send again"
              )}
            </Button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ConfirmEmail;
