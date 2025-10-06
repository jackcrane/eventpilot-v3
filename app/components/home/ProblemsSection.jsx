import { useState } from "react";
import { Accordion } from "../accordion/accordion";
import styles from "./problemssection.module.css";
import participantRegistrationsCount from "../../assets/participant-registrations-count.png";
import participantRegistrationsChange from "../../assets/participant-registrations-change.png";
import inviteAFriendEmail from "../../assets/invite-a-friend-email.png";
import { Typography } from "tabler-react-2";

const TurnoverArg = () => {
  return (
    <div className={styles.arg}>
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

const LateArg = () => {
  return (
    <div className={styles.arg}>
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

const CpaArg = () => {
  return (
    <div className={styles.arg}>
      <Typography.H3>Leverage your existing relationships</Typography.H3>
      <Typography.Text>
        Leverage your existing contacts to grow your participant base by sending
        customized emails, coupon campaigns, and "invite-a-friend" links.
      </Typography.Text>
      <img src={inviteAFriendEmail} className={styles.argImage} />
    </div>
  );
};

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
                  Using manual tools or AI, EventPilot helps you create the
                  perfect email list to reach your target audience.
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
              </>
            ),
          },
        ]}
        openId={open}
        onChange={(nextId) => setOpen(nextId ?? "turnover")}
        className={styles.accordionInteractable}
      />
      {open === "turnover" && <TurnoverArg />}
      {open === "late-reg" && <LateArg />}
      {open === "cpa" && <CpaArg />}
    </div>
  );
};
