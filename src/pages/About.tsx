import { motion } from "framer-motion";
import { 
  Heart, 
  Users, 
  Shield, 
  MapPin, 
  Star, 
  Mail, 
  Globe, 
  Utensils,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { useNavigate } from "react-router-dom";

const values = [
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "We verify halal certifications and provide detailed information so you can dine with confidence.",
  },
  {
    icon: Users,
    title: "Community First",
    description: "Built by the Muslim community, for the Muslim community. Every contribution helps others find halal food.",
  },
  {
    icon: Heart,
    title: "Passion for Food",
    description: "We believe halal food should be easy to find, delicious to eat, and accessible to everyone.",
  },
];

const stats = [
  { number: "1000+", label: "Restaurants Listed" },
  { number: "50+", label: "Cities Covered" },
  { number: "10K+", label: "Community Members" },
  { number: "5K+", label: "Reviews Written" },
];

const features = [
  "Verified halal certification details",
  "Real-time open/closed status",
  "Community reviews and ratings",
  "Interactive map discovery",
  "Save favorites and create lists",
  "Submit new restaurants",
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-gold/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Our Mission</span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Making Halal Food
              <br />
              <span className="text-gradient-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Accessible to All
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              HalalBytes is more than just a food directory. We're a community-driven platform 
              connecting Muslims worldwide with verified halal restaurants, making it easier 
              than ever to find food that aligns with your values.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-3xl md:text-4xl font-bold text-primary mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why We Built HalalBytes
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Finding halal food shouldn't be a challenge. Whether you're traveling to a new city, 
                  exploring your local neighborhood, or simply craving something delicious, knowing 
                  where to find authentic halal options matters.
                </p>
                <p>
                  HalalBytes was born from a simple frustration: the lack of a reliable, 
                  comprehensive resource for halal dining. We wanted to create a platform that 
                  not only lists restaurants but verifies their halal status and shares real 
                  experiences from the community.
                </p>
                <p>
                  Today, we're proud to serve thousands of users who trust HalalBytes to guide 
                  their culinary adventures. Every restaurant listing, every review, and every 
                  feature is designed with you in mind.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Utensils className="h-16 w-16 text-primary/60" />
                  </div>
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                    <Star className="h-12 w-12 text-gold/60" />
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-halal-full/20 to-halal-full/5 flex items-center justify-center">
                    <Shield className="h-12 w-12 text-halal-full/60" />
                  </div>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-gold/5 flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-primary/60" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              These principles guide everything we do at HalalBytes.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group p-8 rounded-2xl bg-card border hover:shadow-elevated transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <value.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-xl text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                What HalalBytes Offers
              </h2>
              <p className="text-muted-foreground mb-8">
                We've packed HalalBytes with features designed to make your halal food 
                discovery experience seamless and enjoyable.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-halal-full shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-gold/10 border"
            >
              <div className="absolute inset-0 rounded-2xl bg-grid-pattern opacity-5" />
              <div className="relative text-center py-12">
                <Globe className="h-20 w-20 text-primary mx-auto mb-6" />
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                  Join Our Community
                </h3>
                <p className="text-muted-foreground mb-6">
                  Be part of the movement to make halal food more accessible worldwide.
                </p>
                <Button size="lg" onClick={() => navigate('/auth/signup')}>
                  Get Started Today
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Mail className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-6 max-w-xl mx-auto">
              Have questions, feedback, or partnership inquiries? 
              We'd love to hear from you.
            </p>
            <a 
              href="mailto:halalbyte@gmail.com"
              className="inline-flex items-center gap-2 text-xl font-semibold hover:underline"
            >
              <Mail className="h-5 w-5" />
              halalbyte@gmail.com
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default About;
