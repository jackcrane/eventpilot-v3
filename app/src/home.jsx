import styled from "styled-components";
import { Page } from "../components/page/Page";
import { Col, Row } from "../util/Flex";
import { useAuth } from "../hooks";
import { Button, Typography } from "tabler-react-2";
import { Browser } from "../components/browser/Browser";
import screenshot from "../assets/screenshot.png";
import { useEffect, useState } from "react";
import paddlefest from "../assets/paddlefest.png";
import swim from "../assets/swim.png";
import orsanco from "../assets/orsanco.png";

const Container = styled.div`
  /* background-color: var(--tblr-body-bg);
  background-image: radial-gradient(
      var(--tblr-primary) 0.5px,
      transparent 0.5px
    ),
    radial-gradient(var(--tblr-primary) 0.5px, var(--tblr-body-bg) 0.5px);
  background-size: 20px 20px;
  background-position: 0 0, 10px 10px; */
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin: 0;
  padding: 0;
  text-align: center;
  width: 60%;
  line-height: 1.2;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.5rem;
  margin: 0;
  padding: 0;
  text-align: center;
  width: 60%;
  line-height: 1.2;
  color: #666;
  margin-bottom: 3rem;
`;

const BrowserContainer = styled.div`
  max-width: 800px;
  margin: auto;
  margin-top: 20px;
  box-shadow: 100px 100px 500px -50px rgba(var(--tblr-primary-rgb), 0.15),
    100px -100px 500px -50px rgba(var(--tblr-danger-rgb), 0.15),
    -100px 100px 500px -50px rgba(var(--tblr-warning-rgb), 0.15),
    -100px -100px 500px -50px rgba(var(--tblr-success-rgb), 0.15);
  border-radius: 5px;
  overflow: hidden;
  transform: translateY(-${(props) => props.scrollPos / 5}px);
  z-index: 0;
`;

const Body = styled.div`
  background-color: var(--tblr-body-bg);
  margin-top: -200px;
  z-index: 10;
  position: relative;
  min-height: 100vh;
  padding: 20px;
  border-top: 1px solid var(--tblr-border-color);
`;

const Section = styled.div`
  max-width: 800px;
  margin: auto;
  margin-bottom: 5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  padding: 0;
  text-align: left;
  line-height: 1.2;
  margin-bottom: 3rem;
  color: var(--tblr-body-color);
  margin: auto;
  margin-bottom: 2rem;
`;

const TestamonialTitle = styled.h4`
  color: #666;
  text-align: center;
  font-weight: normal;
  font-size: 1rem;
  margin-bottom: 2rem;
`;

const TestamonialImage = styled.img`
  max-width: 120px;
  max-height: 80px;
  filter: grayscale(100%);
  opacity: 0.5;
  transition: all 0.2s ease-in-out;
  &:hover {
    filter: grayscale(0%);
    opacity: 1;
  }
`;

const SectionSubtitle = styled.h5`
  background: linear-gradient(
    to right,
    rgba(var(--tblr-primary-rgb), 0.25),
    transparent
  );
  background-size: 100px 100px;
  transition: all 0.2s ease-in-out;
  width: 200px;
  text-align: left;
  padding: 5px 10px;
  border: 1px solid var(--tblr-primary);
  border-left: 4px solid var(--tblr-primary);
  border-right: none;
  background-repeat: no-repeat;
  font-size: 0.9rem;
`;

const SectionText = styled(Typography.Text)`
  text-align: left;
  max-width: 400px;
  font-size: 1.1rem;
`;

const SectionCard = styled.div`
  background-color: rgba(var(--tblr-${(props) => props.color}-rgb), 0.1);
  border: 1px solid var(--tblr-border-color);
  border-radius: 5px;
  padding: 10px;
  flex: 1;
  height: 200px;
  transition: all 0.2s ease-in-out;
  &:hover {
    box-shadow: 0 0 200px -10px rgba(var(--tblr-${(props) => props.color}-rgb), 0.2);
    background-color: rgba(var(--tblr-${(props) => props.color}-rgb), 0.1);
    border-color: rgba(var(--tblr-${(props) => props.color}-rgb), 0.2);
  }
  min-width: 250px;
  max-width: 400px;
`;

const SectionCardTitle = styled.h5`
  font-size: 1rem;
`;

export const Home = () => {
  const { loggedIn } = useAuth();
  const [scrollPos, setScrollPos] = useState(0);
  useEffect(() => {
    window.addEventListener("scroll", () => {
      setScrollPos(window.scrollY);
    });
  }, []);

  return (
    <Container>
      <Page title="Home" allowOverflow>
        <Header>
          <Title>Simplifying event management for every organizer</Title>
          <Subtitle>
            Empower your event with tools to improve volunteer experience,
            increase participant engagement, and grow your organization.
          </Subtitle>
          <Row gap={1}>
            {loggedIn ? (
              <Button href="/events" variant="primary">
                View Your Events
              </Button>
            ) : (
              <>
                <Button href="/login">Login</Button>
                <Button href="/register" variant="primary">
                  Register
                </Button>
              </>
            )}
          </Row>
        </Header>
        <BrowserContainer scrollPos={scrollPos}>
          <Browser>
            <img src={screenshot} alt="EventPilot Screenshot" />
          </Browser>
        </BrowserContainer>
        <Body>
          <Section>
            <TestamonialTitle>
              Trusted by the greatest events in the world
            </TestamonialTitle>
            <Row justify="center" align="center" gap={10}>
              <TestamonialImage src={paddlefest} alt="PaddleFest" />
              <TestamonialImage src={swim} alt="Swim" />
              <TestamonialImage src={orsanco} alt="Orsanco" />
            </Row>
          </Section>
          <Section>
            <Row justify="space-between" align="center" gap={10}>
              <Col align="flex-start">
                <SectionSubtitle>Why EventPilot?</SectionSubtitle>
                <SectionTitle>Discover the benefits of EventPilot</SectionTitle>
              </Col>
              <SectionText>
                Find out why our customers love EventPilot and how it can help
                your event reach new heights.
              </SectionText>
            </Row>
            <Row gap={1} wrap>
              <SectionCard color="primary">
                <SectionCardTitle>Built for Growth</SectionCardTitle>
                <Typography.Text>
                  Grow your event with EventPilot's powerful features. From a
                  tiny backyard event, to massive conferences and festivals,
                  EventPilot is ready to grow with you and help you keep pushing
                  the limits of what a great event can be.
                </Typography.Text>
              </SectionCard>
              <SectionCard color="yellow">
                <SectionCardTitle>Feature-complete</SectionCardTitle>
                <Typography.Text>
                  Say goodbye to migrating to a new system every time you need
                  something new. EventPilot is fully integrated, so you only
                  need to set up your event once.
                </Typography.Text>
              </SectionCard>
              <SectionCard color="red">
                <SectionCardTitle>Portability</SectionCardTitle>
                <Typography.Text>
                  Download a full copy of your data anytime you need to. Your
                  data is yours, you should have access to it! We won't lock you
                  in by keeping your data hostage.
                </Typography.Text>
              </SectionCard>
              <SectionCard color="green">
                <SectionCardTitle>Flexability</SectionCardTitle>
                <Typography.Text>
                  Host anything from a backyard function, to a conference, to a
                  marathon, and everything in between. EventPilot is a flexible
                  tool that can be customized to fit your needs.
                </Typography.Text>
              </SectionCard>
              <SectionCard color="orange">
                <SectionCardTitle>Modernity</SectionCardTitle>
                <Typography.Text>
                  Put your best foot forward with EventPilot's modern design.
                  You will look professional and up-to-the-times to prospective
                  attendees and volunteers.
                </Typography.Text>
              </SectionCard>
              <SectionCard color="cyan">
                <SectionCardTitle>Extensibility</SectionCardTitle>
                <Typography.Text>
                  Get access to our APIs an extend EventPilot's functionality to
                  even better serve your event. Recieve webhooks and connect to
                  our REST API to build a truly custom experience.
                </Typography.Text>
              </SectionCard>
            </Row>
          </Section>
        </Body>
      </Page>
    </Container>
  );
};
