import { motion, AnimatePresence } from "framer-motion";
import { Shield, Clock, User, Globe } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useEffect } from "react";

const Privacy = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    {
      title: "Information We Collect",
      icon: User,
      content: [
        {
          subtitle: "Account Information",
          description: "When you register, we store your email address and encrypted password via Supabase Auth."
        },
        {
          subtitle: "Location Data",
          description: "To find restaurants near you, we request access to your device's precise location (GPS). This data is processed in real-time and is only stored if you explicitly save a 'favorite' location to your profile."
        },
        {
          subtitle: "Usage Data",
          description: "We collect basic information about how you interact with our site (e.g., which restaurants you click on) to improve our recommendations."
        }
      ]
    },
    {
      title: "How We Use Your Information",
      icon: Globe,
      content: [
        "To provide localized restaurant search results.",
        "To manage your account and provide customer support.",
        "To send you updates or promotional offers from sponsored restaurants (only if you opt-in)."
      ]
    },
    {
      title: "Third-Party Services",
      icon: Shield,
      content: [
        "We use Supabase for database management and Cloudflare for hosting and security. These providers have access to your data only to perform tasks on our behalf and are obligated not to disclose or use it for other purposes."
      ]
    },
    {
      title: "Your Rights",
      icon: Clock,
      content: [
        "You may update your account details or delete your account at any time through your profile settings. Deleting your account will remove your personal data from our Supabase production database."
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
            <Shield className="h-5 w-5" />
            Privacy Policy
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Your Privacy Matters
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            At HalalBytes, we value your privacy. This policy explains what information we collect and how we use it.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Effective Date: February 12, 2026
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-12 px-4">
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
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <div className="bg-card rounded-2xl p-8 border shadow-sm">
            <h3 className="font-display text-xl font-bold text-foreground mb-4">
              Questions About Your Privacy?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              If you have any questions about this privacy policy or how we handle your data, 
              please contact us through our support channels.
            </p>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Privacy;
