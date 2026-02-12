import { motion, AnimatePresence } from "framer-motion";
import { Scale, AlertTriangle, Shield, Users, FileText } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useEffect } from "react";

const Terms = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      title: "Description of Service",
      icon: FileText,
      content: [
        "HalalBytes provides a platform for users to locate restaurants that may offer halal food options. While we strive for accuracy, HalalBytes does not own, operate, or certify any of the restaurants listed on the platform."
      ]
    },
    {
      title: "No Guarantee of Halal Status (Crucial Disclaimer)",
      icon: AlertTriangle,
      content: [
        {
          subtitle: "User Responsibility",
          description: "The 'halal' status of a restaurant is subject to change without notice. Information provided on HalalBytes is for informational purposes only."
        },
        {
          subtitle: "Verification",
          description: "You are solely responsible for verifying the halal certification or food preparation practices directly with the restaurant before consuming any products."
        },
        {
          subtitle: "No Liability",
          description: "HalalBytes shall not be held liable for any damages, health issues, or religious concerns arising from a restaurant's failure to maintain halal standards or for inaccuracies in our listings."
        }
      ]
    },
    {
      title: "Sponsored Content and Third-Party Links",
      icon: Users,
      content: [
        {
          subtitle: "Disclosure",
          description: "Sponsored content will be clearly identified."
        },
        {
          subtitle: "Endorsement",
          description: "Inclusion of a sponsored restaurant does not constitute an endorsement or a guarantee of its halal status by HalalBytes."
        },
        {
          subtitle: "Third-Party Interactions",
          description: "Any transactions or interactions between you and a restaurant (sponsored or otherwise) are strictly between you and that third party."
        }
      ]
    },
    {
      title: "Limitation of Liability",
      icon: Shield,
      content: [
        "To the maximum extent permitted by law, HalalBytes and its owners shall not be liable for any indirect, incidental, or consequential damages resulting from:",
        "• Inaccurate restaurant information (location, hours, or dietary status).",
        "• Foodborne illness, allergic reactions, or other health-related issues.",
        "• Service interruptions or data loss.",
        "In no event shall our total liability exceed the amount you paid (if any) to use the site."
      ]
    },
    {
      title: "Intellectual Property",
      icon: Scale,
      content: [
        "All content, logos, and code on HalalBytes are the property of HalalBytes and are protected by copyright laws. You may not scrape, copy, or redistribute our data for commercial purposes without prior written consent."
      ]
    },
    {
      title: "User Conduct",
      icon: Shield,
      content: [
        "By using this site, you agree not to:",
        "• Submit false or misleading reviews or information.",
        "• Attempt to bypass any security measures of the website.",
        "• Use the site for any illegal or unauthorized purposes."
      ]
    },
    {
      title: "Changes to Terms",
      icon: FileText,
      content: [
        "We reserve the right to modify these Terms at any time. Your continued use of the site following any changes constitutes acceptance of the new Terms."
      ]
    },
    {
      title: "Governing Law",
      icon: Scale,
      content: [
        "These Terms are governed by the laws of the State of Ohio, without regard to its conflict of law principles. Any legal action related to these Terms shall be filed in the courts located in Franklin County, Ohio."
      ]
    }
  ];

  return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-halal-full/5 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 text-primary font-medium mb-6">
            <Scale className="h-5 w-5" />
            Terms of Service
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Terms of Service
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Welcome to HalalBytes. By accessing or using our website, you agree to be bound by these Terms of Service.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Last Updated: February 12, 2026
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-8 border shadow-sm"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {section.title}
                </h2>
              </div>

              {section.content.map((item, itemIndex) => (
                <div key={itemIndex} className="mb-6 last:mb-0">
                  {typeof item === 'string' ? (
                    <p className="text-muted-foreground leading-relaxed">{item}</p>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">{item.subtitle}</h3>
                      <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <div className="bg-card rounded-2xl p-8 border shadow-sm">
            <h3 className="font-display text-xl font-bold text-foreground mb-4">
              Questions About These Terms?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              By using HalalBytes, you acknowledge that you have read, understood, 
              and agree to be bound by these Terms of Service. If you do not agree, 
              please do not use our services.
            </p>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Terms;
