import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

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
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (currentStep === 'tos' && !tosScrolled) {
              setTosScrolled(true);
            } else if (currentStep === 'privacy' && !privacyScrolled) {
              setPrivacyScrolled(true);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.01
      }
    );

    let targetElement: HTMLElement | null = null;
    let retryCount = 0;
    const maxRetries = 50;

    const tryFindTarget = () => {
      if (scrollAreaRef.current) {
        const targetSelector = currentStep === 'tos' ? '.scroll-target-tos' : '.scroll-target-privacy';
        targetElement = scrollAreaRef.current.querySelector(targetSelector);
        if (targetElement) {
          observer.observe(targetElement);
          return;
        }
      }

      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryFindTarget, 100);
      }
    };

    tryFindTarget();

    return () => {
      if (targetElement) {
        observer.unobserve(targetElement);
      }
    };
  }, [currentStep, isOpen]);

  const handleAgree = () => {
    if (currentStep === 'tos') {
      setTosAgreed(true);
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
        {/* CHANGED: Added w-[95vw] to force mobile width consistency */}
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0 rounded-xl">
          <DialogHeader className="p-4 md:p-6 pb-0">
            <DialogTitle className="text-xl md:text-2xl font-display font-bold">
              {currentStep === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative">
            {/* CHANGED: Responsive padding (p-4 md:p-6) */}
            <ScrollArea ref={scrollAreaRef} className="h-[60vh] p-4 md:p-6" data-radix-scroll-area-viewport>
              {currentStep === 'tos' ? (
                <div className="space-y-6 md:space-y-8">
                  {/* CHANGED: Responsive padding (p-6 md:p-8) */}
                  <div className="bg-card rounded-2xl p-6 md:p-8 border shadow-sm">
                    <div className="flex items-center gap-4 mb-4 md:mb-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                        Terms of Service
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-base md:text-lg mb-4">
                      Welcome to HalalBytes. By accessing or using our website, you agree to be bound by these Terms of Service.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Last Updated: February 12, 2026
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    {/* CHANGED: Responsive padding for all cards (p-4 md:p-6) */}
                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Description of Service</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        HalalBytes provides a platform for users to locate restaurants that may offer halal food options. 
                        While we strive for accuracy, HalalBytes does not own, operate, or certify any of the restaurants 
                        listed on the platform.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">No Guarantee of Halal Status</h3>
                      <div className="space-y-2 text-sm md:text-base text-muted-foreground">
                        <p><strong>User Responsibility:</strong> The 'halal' status of a restaurant is subject to change without notice.</p>
                        <p><strong>Verification:</strong> You are solely responsible for verifying the halal certification directly with the restaurant.</p>
                        <p><strong>No Liability:</strong> HalalBytes shall not be held liable for any damages arising from a restaurant's failure to maintain halal standards.</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Limitation of Liability</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        To the maximum extent permitted by law, HalalBytes shall not be liable for any indirect or consequential damages.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Governing Law</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        These Terms are governed by the laws of the State of Ohio.
                      </p>
                    </div>

                    <div className="scroll-target-tos h-1 w-full" aria-hidden="true"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8">
                  {/* CHANGED: Responsive padding (p-6 md:p-8) to match TOS */}
                  <div className="bg-card rounded-2xl p-6 md:p-8 border shadow-sm">
                    <div className="flex items-center gap-4 mb-4 md:mb-6">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Check className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
                        Privacy Policy
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-base md:text-lg mb-4">
                      At HalalBytes, we value your privacy. This policy explains what information we collect and how we use it.
                    </p>
                    <div className="text-sm text-muted-foreground">
                      Effective Date: February 12, 2026
                    </div>
                  </div>

                  <div className="space-y-4 md:space-y-6">
                    {/* CHANGED: Responsive padding (p-4 md:p-6) to match TOS */}
                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Information We Collect</h3>
                      <div className="space-y-2 text-sm md:text-base text-muted-foreground">
                        <p><strong>Account Information:</strong> When you register, we store your email address and encrypted password.</p>
                        <p><strong>Location Data:</strong> We request access to your device's precise location (GPS) to find restaurants near you.</p>
                        <p><strong>Usage Data:</strong> We collect basic information about how you interact with our site.</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">How We Use Your Information</h3>
                      <div className="space-y-1 text-sm md:text-base text-muted-foreground">
                        <p>• To provide localized restaurant search results.</p>
                        <p>• To manage your account and provide customer support.</p>
                        <p>• To send you updates (only if you opt-in).</p>
                      </div>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Third-Party Services</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        We use Supabase and Cloudflare. These providers have access to your data only to perform tasks on our behalf.
                      </p>
                    </div>

                    <div className="bg-card rounded-xl p-4 md:p-6 border">
                      <h3 className="font-semibold text-foreground mb-2">Your Rights</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        You may update your account details or delete your account at any time through your profile settings.
                      </p>
                    </div>

                    <div className="scroll-target-privacy h-1 w-full" aria-hidden="true"></div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="p-4 md:p-6 border-t">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                {currentStep === 'tos' ? (
                  <>
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                    Please scroll to continue
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                    Please scroll to agree
                  </>
                )}
              </div>
              
              <div className="flex gap-2 md:gap-3">
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
                  {currentStep === 'tos' ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  onClick={handleAgree}
                  disabled={currentStep === 'tos' ? !tosScrolled : !privacyScrolled}
                  className="gap-2"
                >
                  <Check className="w-4 h-4" />
                  {currentStep === 'tos' ? 'I Agree' : 'I Agree'}
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