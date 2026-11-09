import type { User } from "@/lib/api/types";
import DemoSection from "./DemoSection";
import FeaturesSection from "./FeaturesSection";
import Footer from "./Footer";
import ForWhomSection from "./ForWhomSection";
import Header from "./Header";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Outcomes from "./Outcomes";
import LazyTriageDemo from "./LazyTriageDemo";

export default function LandingPage({ user }: { user: User | null }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="skip-link">
        Skip to Content
      </a>
      <Header user={user} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Hero user={user} />
        <Outcomes />
        <HowItWorks />
        <LazyTriageDemo />
        <FeaturesSection />
        <ForWhomSection />
        <DemoSection />
      </main>
      <Footer />
    </div>
  );
}
