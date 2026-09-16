import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Shift from "@/components/sections/Shift";
import Assistant from "@/components/sections/Assistant";
import Communication from "@/components/sections/Communication";
import Team from "@/components/sections/Team";
import Matches from "@/components/sections/Matches";
import Attendance from "@/components/sections/Attendance";
import Connected from "@/components/sections/Connected";
import Club from "@/components/sections/Club";
import Contrast from "@/components/sections/Contrast";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Shift />
        <Assistant />
        <Communication />
        <Team />
        <Matches />
        <Attendance />
        <Connected />
        <Club />
        <Contrast />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
