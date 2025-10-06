import { Hero } from "../components/home/Hero";
import { HeroText } from "../components/home/HeroText";
import { ImageSection } from "../components/home/ImageSection";
import { TopNav } from "../components/home/TopNav";
import { useAuth } from "../hooks";
import { Typography } from "tabler-react-2";

import screenshot from "../assets/screenshot.png";
import { Everything } from "../assets/everything.jsx";
import { useMousePositionVars } from "../hooks/useMousePositionVars";
import { ThatsMeSection } from "../components/home/ThatsMeSection";
import { Section } from "../components/home/Section";
import { ReplacementSection } from "../components/home/ReplacementSection";
import { Footer } from "../components/home/Footer";
import { ProblemsSection } from "../components/home/ProblemsSection";

export const Home = () => {
  const { loggedIn } = useAuth();
  useMousePositionVars();

  return (
    <>
      <TopNav />
      <Hero />
      <HeroText />
      <div className={"mb-6"} />
      <ImageSection src={screenshot}>
        <Typography.H3>Every tool you need. Right here.</Typography.H3>
        <Typography.H4>
          EventPilot arms events management teams with never-before-accessible
          tools to manage, grow, and understand their events.
        </Typography.H4>
      </ImageSection>
      <ImageSection src={<Everything />} isNode>
        <Typography.H3>Made for you (yes, you).</Typography.H3>
        <Typography.H4>
          EventPilot is designed for medium- to large-scale events.
        </Typography.H4>
      </ImageSection>
      <ImageSection src={<ThatsMeSection />} isNode>
        <Typography.H3>Events have problems.</Typography.H3>
        <Typography.H4>
          At least they used to. EventPilot is specifically designed around
          common pain points for event teams.
        </Typography.H4>
      </ImageSection>
      <ImageSection src={<ProblemsSection />} isNode>
        <Typography.H3 id="versus">
          The right tools in the right place.
        </Typography.H3>
        <Typography.H4>
          EventPilot is designed to replace your disjointed collection of
          services and applications, bringing everything under one roof.
        </Typography.H4>
      </ImageSection>
      <ImageSection src={<ReplacementSection />} isNode>
        <Footer />
      </ImageSection>
    </>
  );
};
