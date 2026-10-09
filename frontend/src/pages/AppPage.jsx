import LandingNavbar from "../components/landing/LandingNavbar";
import Hero from "../components/landing/Hero";
import WhatIsYo from "../components/landing/sections/WhatIsYo";
import AskShowcase from "../components/landing/sections/AskShowcase";
import DropShowcase from "../components/landing/sections/DropShowcase";
import LearnShowcase from "../components/landing/sections/LearnShowcase";
import ModesShowcase from "../components/landing/ModesShowcase";
import Closing from "../components/landing/Closing";
import LandingInstallPill from "../components/LandingInstallPill";

export default function AppPage() {
  return (
    <div className="yo-landing min-h-screen bg-[var(--yol-bg)] text-[var(--yol-fg)] antialiased overflow-x-clip">
      <LandingNavbar />
      <Hero />
      <WhatIsYo />
      <AskShowcase />
      <DropShowcase />
      <LearnShowcase />
      <ModesShowcase />
      <Closing />
      <LandingInstallPill />
    </div>
  );
}