import { useState } from "react";
import { Accordion } from "../accordion/accordion.jsx";
import styles from "./problemssection.module.css";
import participantRegistrationsCount from "../../assets/participant-registrations-count.png";
import participantRegistrationsChange from "../../assets/participant-registrations-change.png";
import inviteAFriendEmail from "../../assets/invite-a-friend-email.png";
import createAiSegment from "../../assets/create-ai-segment.png";
import upsells from "../../assets/upsells.png";
import { Typography } from "tabler-react-2";
import classNames from "classnames";

const TurnoverArg = ({ className }) => {
  return (
    <div className={classNames(styles.arg, className)}>
      <Typography.H3>Keep your participants engaged</Typography.H3>
      <Typography.Text>
        Keeping your participants engaged is the key to growing your event. Use
        EventPilot to understand what participants aren't coming back and target
        them with personalized marketing.
      </Typography.Text>
      <img src={participantRegistrationsCount} className={styles.argImage} />
    </div>
  );
};

const LateArg = ({ className }) => {
  return (
    <div className={classNames(styles.arg, className)}>
      <Typography.H3>Don't stress the late registrations</Typography.H3>
      <Typography.Text>
        Every event will have late registrations. Participants wait for
        everything from scheduling to economic to weather factors to place their
        registration.
      </Typography.Text>
      <Typography.Text>
        With the right tools, you can understand how your registrations are
        progressing relative to your goals and data from previous years,
        enabling you to make informed decisions.
      </Typography.Text>
      <img src={participantRegistrationsChange} className={styles.argImage} />
    </div>
  );
};

const CpaArg = ({ className }) => {
  return (
    <div className={classNames(styles.arg, className)}>
      <Typography.H3>Leverage your existing relationships</Typography.H3>
      <Typography.Text>
        Leverage your existing contacts to grow your participant base by sending
        customized emails, coupon campaigns, and "invite-a-friend" links.
      </Typography.Text>
      <img src={inviteAFriendEmail} className={styles.argImage} />
    </div>
  );
};

const TargetedCampaignsArg = ({ className }) => {
  return (
    <div className={classNames(styles.arg, className)}>
      <Typography.H3>Create personalized marketing</Typography.H3>
      <Typography.Text>
        Use EventPilot's tools to create personalized marketing to tailor your
        outreach to <b>reach</b>, <b>engage</b>, and <b>covert</b> your target
        audience.
      </Typography.Text>
      <Typography.Text>
        Using manual tools or AI, EventPilot helps you create the perfect email
        list to reach your target audience.
      </Typography.Text>
      <Typography.Text>
        Query for <b>anything</b> from your event data and build advanced
        segments to send the perfect email blast to your target audience.
      </Typography.Text>
      <img src={createAiSegment} className={styles.argImage} />
    </div>
  );
};

const NoUpsellsArg = ({ className }) => {
  return (
    <div className={classNames(styles.arg, className)}>
      <Typography.H3>Build your upsell storefront</Typography.H3>
      <Typography.Text>
        EventPilot automatically bakes upsells into your registration flow, so
        all you have to do is tell people about them. Keep track of stock,
        availability, sales, segmentation, and more, all right in the dashboard.
      </Typography.Text>
      <img src={upsells} className={styles.argImage} />
    </div>
  );
};

const Details = ({ open, isMobile = true }) => (
  <>
    {open === "turnover" && (
      <TurnoverArg className={isMobile ? styles.mobile : ""} />
    )}
    {open === "late-reg" && (
      <LateArg className={isMobile ? styles.mobile : ""} />
    )}
    {open === "cpa" && <CpaArg className={isMobile ? styles.mobile : ""} />}
    {open === "targeted-campaigns" && (
      <TargetedCampaignsArg className={isMobile ? styles.mobile : ""} />
    )}
    {open === "no-upsells" && (
      <NoUpsellsArg className={isMobile ? styles.mobile : ""} />
    )}
  </>
);

export const ProblemsSection = () => {
  const [open, setOpen] = useState("turnover");
  return (
    <div className={styles.accordion}>
      <Accordion
        items={[
          {
            id: "turnover",
            title: "Participant Turnover",
            content: (
              <>
                <p>
                  The average event sees a <b>82.6%</b> turnover rate. That
                  means that only <b>17.4%</b> of participants return for a
                  second year.
                </p>
                <p>
                  It is tough to find participants, don't just let them drop!
                </p>
                <Details open={open} isMobile={true} />
              </>
            ),
          },
          {
            id: "late-reg",
            title: "Late Registrations",
            content: (
              <>
                <p>
                  On agerage, <b>24%</b> of participants register in the week
                  leading up to the event.
                </p>
                <p>
                  EventPilot gives you the tools to understand your participants
                  and to have a strong handle on how registration is going so
                  you don't need to stress.
                </p>
                <p>
                  And when it is time for next year, EventPilot has tools to
                  encourage your participants to register earlier.
                </p>
                <Details open={open} isMobile={true} />
              </>
            ),
          },
          {
            id: "cpa",
            title: "Cost per Participant Acquisition",
            content: (
              <>
                <p>
                  Leverage your existing relationships and data to tap into your
                  existing network before spending to acquire new participants.
                </p>
                <p>
                  Use EventPilot's tools to create personalized marketing to
                  tailor your outreach to <b>reach</b>, <b>engage</b>, and{" "}
                  <b>covert</b> your target audience.
                </p>
                <Details open={open} isMobile={true} />
              </>
            ),
          },
          {
            id: "targeted-campaigns",
            title: "Missing Target Audiences",
            content: (
              <>
                <p>
                  Events frequently have challenges targeting the right audience
                  with their email blasts.
                </p>
                <p>
                  Everything from emailing <b>everyone</b> to emailing{" "}
                  <b>
                    participants who participated in 2022 and 2023 but not 2024
                    and has not yet registered for 2025 (and bought at least 2
                    shirts in 2023)
                  </b>
                  , your email lists are driven by your data.
                </p>
                <Details open={open} isMobile={true} />
              </>
            ),
          },
          {
            id: "no-upsells",
            title: "Challenges Selling Upsells",
            content: (
              <>
                <p>
                  Only <b>1.3%</b> of an average event's revenue comes from
                  upsells.
                </p>
                <p>
                  With EventPilot, you can build your upsell storefront right
                  into registration, include them in your email blasts, and get
                  detailed analytics on it all.
                </p>
                <Details open={open} isMobile={true} />
              </>
            ),
          },
        ]}
        openId={open}
        onChange={(nextId) => setOpen(nextId ?? "turnover")}
        className={styles.accordionInteractable}
      />
      <Details open={open} isMobile={false} />
    </div>
  );
};
