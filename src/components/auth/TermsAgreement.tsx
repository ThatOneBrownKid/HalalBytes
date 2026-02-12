import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";

interface TermsAgreementProps {
  onAgreementChange: (agreed: boolean) => void;
  isAgreed: boolean;
}

const TermsAgreement = ({ onAgreementChange, isAgreed }: TermsAgreementProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [tosScrolled, setTosScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [currentStep, setCurrentStep] = useState<'tos' | 'privacy'>('tos');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tosAgreed && privacyAgreed) {
      onAgreementChange(true);
      setIsOpen(false);
    } else {
      onAgreementChange(false);
    }
  }, [tosAgreed, privacyAgreed, onAgreementChange]);

  useEffect(() => {
    if (!isOpen) return; // Only set up observer when dialog is open

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          console.log('Intersection Observer:', {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            target: entry.target,
            currentStep,
            tosScrolled,
            privacyScrolled
          });
          
          if (entry.isIntersecting) {
            if (currentStep === 'tos' && !tosScrolled) {
              console.log('Setting tosScrolled to true');
              setTosScrolled(true);
            } else if (currentStep === 'privacy' && !privacyScrolled) {
              console.log('Setting privacyScrolled to true');
              setPrivacyScrolled(true);
            }
          }
        });
      },
      {
        root: null, // Use the viewport
        rootMargin: '0px',
        threshold: 0.01 // Trigger when even 1% of the target is visible
      }
    );

    let targetElement: HTMLElement | null = null;
    let retryCount = 0;
    const maxRetries = 50; // Try for up to 5 seconds

    const tryFindTarget = () => {
      if (scrollAreaRef.current) {
        const targetSelector = currentStep === 'tos' ? '.scroll-target-tos' : '.scroll-target-privacy';
        targetElement = scrollAreaRef.current.querySelector(targetSelector);
        console.log('Target element found:', targetElement, 'selector:', targetSelector, 'retry:', retryCount);
        if (targetElement) {
          observer.observe(targetElement);
          return;
        }
      }

      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryFindTarget, 100); // Try again in 100ms
      } else {
        console.log('Failed to find target element after', maxRetries, 'attempts');
      }
    };

    // Start trying to find the target element
    tryFindTarget();

    return () => {
      if (targetElement) {
        observer.unobserve(targetElement);
      }
    };
  }, [currentStep, isOpen]); // Remove tosScrolled and privacyScrolled from dependencies to avoid re-creating observer on every scroll state change

  const handleScroll = (type: 'tos' | 'privacy') => {
    if (type === 'tos') {
      setTosScrolled(true);
    } else {
      setPrivacyScrolled(true);
    }
  };

  const handleAgree = () => {
    if (currentStep === 'tos') {
      setTosAgreed(true);
      // Reset scroll position first, then switch step
      if (scrollAreaRef.current) {
        const content = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (content) {
          content.scrollTop = 0;
        }
      }
      setCurrentStep('privacy');
    } else {
      setPrivacyAgreed(true);
    }
  };

  const resetAgreement = () => {
    setTosAgreed(false);
    setPrivacyAgreed(false);
    setTosScrolled(false);
    setPrivacyScrolled(false);
    setCurrentStep('tos');
    onAgreementChange(false);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              isAgreed 
                ? "border-halal-full bg-halal-full/5 text-halal-full" 
                : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50"
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              isAgreed ? "bg-halal-full border-halal-full" : "border-muted-foreground/40"
            }`}>
              {isAgreed && <Check className="w-3 h-3 text-white" />}
            </div>
            <div className="text-left">
              <div className="font-medium">I agree to the Terms of Service and Privacy Policy</div>
              <div className="text-sm text-muted-foreground">
                Please review and agree to continue
              </div>
            </div>
          </button>
        </div>
        
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-display font-bold">
              {currentStep === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative">
            <ScrollArea ref={scrollAreaRef} className="h-[60vh] p-6" data-radix-scroll-area-viewport>
              {currentStep === 'tos' ? (
                <div className="space-y-8">
                  <div className="bg-card rounded-2xl p-8 border shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        Terms of Service
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-lg mb-4">
                      Welcome to HalalBytes. By accessing or using our website, you agree to be bound by these Terms of Service.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Last Updated: February 12, 2026
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Description of Service</h3>
                      <p className="text-muted-foreground">
                        HalalBytes provides a platform for users to locate restaurants that may offer halal food options. 
                        While we strive for accuracy, HalalBytes does not own, operate, or certify any of the restaurants 
                        listed on the platform.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">No Guarantee of Halal Status (Crucial Disclaimer)</h3>
                      <div className="space-y-2 text-muted-foreground">
                        <p><strong>User Responsibility:</strong> The 'halal' status of a restaurant is subject to change without notice. 
                        Information provided on HalalBytes is for informational purposes only.</p>
                        <p><strong>Verification:</strong> You are solely responsible for verifying the halal certification or food 
                        preparation practices directly with the restaurant before consuming any products.</p>
                        <p><strong>No Liability:</strong> HalalBytes shall not be held liable for any damages, health issues, or 
                        religious concerns arising from a restaurant's failure to maintain halal standards or for inaccuracies 
                        in our listings.</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Limitation of Liability</h3>
                      <p className="text-muted-foreground">
                        To the maximum extent permitted by law, HalalBytes and its owners shall not be liable for any indirect, 
                        incidental, or consequential damages resulting from inaccurate restaurant information, foodborne illness, 
                        allergic reactions, or other health-related issues. In no event shall our total liability exceed the 
                        amount you paid (if any) to use the site.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Governing Law</h3>
                      <p className="text-muted-foreground">
                        These Terms are governed by the laws of the State of Ohio, without regard to its conflict of law principles. 
                        Any legal action related to these Terms shall be filed in the courts located in Franklin County, Ohio.
                      </p>
                    </div>

                    {/* Invisible target for Intersection Observer */}
                    <div className="scroll-target-tos h-1 w-full" aria-hidden="true"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-card rounded-2xl p-8 border shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary" />
                      </div>
                      <h2 className="font-display text-2xl font-bold text-foreground">
                        Privacy Policy
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-lg mb-4">
                      At HalalBytes, we value your privacy. This policy explains what information we collect and how we use it.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Effective Date: February 12, 2026
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Information We Collect</h3>
                      <div className="space-y-2 text-muted-foreground">
                        <p><strong>Account Information:</strong> When you register, we store your email address and encrypted password via Supabase Auth.</p>
                        <p><strong>Location Data:</strong> To find restaurants near you, we request access to your device's precise location (GPS). 
                        This data is processed in real-time and is only stored if you explicitly save a 'favorite' location to your profile.</p>
                        <p><strong>Usage Data:</strong> We collect basic information about how you interact with our site (e.g., which restaurants you click on) 
                        to improve our recommendations.</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">How We Use Your Information</h3>
                      <div className="space-y-1 text-muted-foreground">
                        <p>• To provide localized restaurant search results.</p>
                        <p>• To manage your account and provide customer support.</p>
                        <p>• To send you updates or promotional offers from sponsored restaurants (only if you opt-in).</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Third-Party Services</h3>
                      <p className="text-muted-foreground">
                        We use Supabase for database management and Cloudflare for hosting and security. These providers have access to your data 
                        only to perform tasks on our behalf and are obligated not to disclose or use it for other purposes.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Your Rights</h3>
                      <p className="text-muted-foreground">
                        You may update your account details or delete your account at any time through your profile settings. 
                        Deleting your account will remove your personal data from our Supabase production database.
                      </p>
                    </div>

                    {/* Invisible target for Intersection Observer */}
                    <div className="scroll-target-privacy h-1 w-full" aria-hidden="true"></div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="p-6 border-t">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {currentStep === 'tos' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Please scroll to the bottom to continue
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Please scroll to the bottom to agree
                  </>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 'tos') {
                      setIsOpen(false);
                    } else {
                      setCurrentStep('tos');
                      setPrivacyAgreed(false);
                      setPrivacyScrolled(false);
                    }
                  }}
                >
                  {currentStep === 'tos' ? 'Cancel' : 'Back to Terms'}
                </Button>
                <Button
                  onClick={handleAgree}
                  disabled={currentStep === 'tos' ? !tosScrolled : !privacyScrolled}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  {currentStep === 'tos' ? 'I Agree to Terms' : 'I Agree to Privacy Policy'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TermsAgreement;