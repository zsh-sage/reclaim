import type { User } from "@/lib/api/types";
import DemoSection from "./DemoSection";
import FeaturesSection from "./FeaturesSection";
import Footer from "./Footer";
import ForWhomSection from "./ForWhomSection";
import Header from "./Header";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import ProblemSection from "./ProblemSection";
import StatsBand from "./StatsBand";

export default function LandingPage({ user }: { user: User | null }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header user={user} />
      <main id="main" tabIndex={-1} className="flex-1 scroll-smooth focus:outline-none">
        <Hero user={user} />
        <ProblemSection />
        <HowItWorks />
        <FeaturesSection />
        <StatsBand />
        <ForWhomSection />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
}
