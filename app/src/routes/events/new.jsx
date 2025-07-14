import {
  Typography,
  Input,
  Button,
  Util,
  Alert,
  SegmentedControl,
  useOffcanvas,
} from "tabler-react-2";
import { Page } from "../../../components/page/Page";
import { useState } from "react";
import { SlugInput } from "../../../components/slugInput/SlugInput";
import { Dropzone } from "../../../components/dropzone/Dropzone";
import { Icon } from "../../../util/Icon";
import { TzPicker } from "../../../components/tzDateTime/tzDateTime";
import React from "react";
import ReactConfetti from "react-confetti";
import { isEmail } from "../../../util/isEmail";
import { Row } from "../../../util/Flex";
import { EventChecklist } from "../../../components/EventChecklist/EventChecklist";
import { useAuth } from "../../../hooks";
import { HostedEmailComparisonPopoverContent } from "../../../components/HostedEmailComparison/HostedEmailComparison";
import { useEvents } from "../../../hooks/useEvents";
import toast from "react-hot-toast";

export const NewEventPage = () => {
  const [event, setEvent] = useState({
    name: null,
    description: null,
    slug: null,
    defaultTz: null,
    logoFileId: null,
    bannerFileId: null,
    useUserEmailAsContact: null,
    useHostedEmail: null,
    willForwardEmail: true,
  });
  window.setEvent = setEvent;
  const [stage, setStage] = useState(0);
  const { schema, mutationLoading, createEvent } = useEvents();
  const [err, setErr] = useState(null);

  const onChangeEvent = (e) => {
    setEvent({ ...event, ...e });
  };

  const onSubmit = () => {
    try {
      const parsed = schema.parse(event);
      createEvent(parsed);
      return true;
    } catch (e) {
      setErr(e);
      console.log(e);
      toast.error("Error submitting event");
      return false;
    }
  };
  window.onSubmit = onSubmit;

  return (
    <Page showPicker={false}>
      <div style={{ maxWidth: 1000, margin: "auto" }}>
        <Util.Row align="flex-start" gap={2}>
          <div style={{ flex: 1 }}>
            <Typography.H1>Create a new event</Typography.H1>
            <Typography.Text>
              Creating a new event is the first step to getting your event up
              and running in EventPilot!
            </Typography.Text>

            {stage === 0 && (
              <EventBasicInfo event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 1 && (
              <EventContact event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 2 && (
              <EventAssets event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 3 && (
              <EventSocials
                event={event}
                onChangeEvent={onChangeEvent}
                setStage={setStage}
              />
            )}
            {stage === 4 && (
              <Submit
                event={event}
                onChangeEvent={onChangeEvent}
                onSubmit={onSubmit}
                err={err}
                loading={mutationLoading}
              />
            )}
            {stage === 5 && (
              <Finished event={event} onChangeEvent={onChangeEvent} />
            )}
            <Util.Hr className="mt-4" />
            <Util.Row align="center" gap={2}>
              {stage > 0 && (
                <Button onClick={() => setStage(stage - 1)} className="mt-3">
                  <Util.Row align="center" gap={1}>
                    <Icon i={"arrow-left"} size={16} />
                    Previous
                  </Util.Row>
                </Button>
              )}
              {stage < 4 && (
                <Button onClick={() => setStage(stage + 1)} className="mt-3">
                  <Util.Row align="center" gap={1}>
                    Next
                    <Icon i={"arrow-right"} size={16} />
                  </Util.Row>
                </Button>
              )}
            </Util.Row>
          </div>
          <EventChecklist event={event} setStage={setStage} />
        </Util.Row>
      </div>
    </Page>
  );
};

const EventBasicInfo = ({ event = {}, onChangeEvent }) => {
  return (
    <>
      <Typography.H2>Basic Information</Typography.H2>
      <Typography.Text>
        Fill out the basic information about your event. You can change this
        information at any time in the future.
      </Typography.Text>
      <Input
        value={event.name}
        onChange={(e) => onChangeEvent({ name: e })}
        label="Event Name"
        required
        placeholder="Event Name"
        hint="The name of your event. This is required and must be at least 2 characters long."
        labelDescription={
          event.name?.length < 2
            ? `${2 - event.name.length} characters left`
            : event.name?.length > 50
            ? `${event.name.length - 50} characters too long`
            : null
        }
      />
      <Input
        value={event.description}
        onChange={(e) => onChangeEvent({ description: e })}
        label="Event Description"
        placeholder="Event Description"
        hint="A description of your event. This is required and must be at least 10 characters long."
        labelDescription={
          event.description?.length < 10
            ? `${10 - event.description.length} characters left`
            : event.description?.length > 255
            ? `${event.description.length - 255} characters too long`
            : null
        }
        required
      />
      <SlugInput
        value={event.slug}
        onChange={(e) => onChangeEvent({ slug: e })}
      />
      <TzPicker
        required
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
        prompt={"Select a default timezone"}
        onChange={(d) => onChangeEvent({ defaultTz: d })}
        value={event.defaultTz}
      />
    </>
  );
};

const EventAssets = ({ event = {}, onChangeEvent }) => {
  return (
    <>
      <Typography.H2>Event Assets</Typography.H2>
      <Typography.Text>
        Upload images and logos for your event. You can change this at any time
        in the future. We require a logo and a banner image.
      </Typography.Text>
      <Dropzone
        label="Logo"
        required
        onSuccessfulUpload={(d) =>
          onChangeEvent({
            logoFileId: d.fileId,
            logo: {
              location: d.url,
            },
          })
        }
        value={event.logo}
        hint="A logo for your event. This is required, and should be a square image at least 200px by 200px."
        accept="image/*"
      />
      <Dropzone
        label="Banner image"
        required
        value={event.banner}
        onSuccessfulUpload={(d) =>
          onChangeEvent({
            bannerFileId: d.fileId,
            banner: {
              location: d.url,
            },
          })
        }
        hint="A banner image for your event. This is required, and should be a rectangular image. It will be shown across the top of your webpages."
        accept="image/*"
      />

      <label class="form-label required">IP & Usage Rights</label>
      <Typography.Text>
        By continuing and uploading these images, you agree that you have the
        legal rights to use these images.
      </Typography.Text>
    </>
  );
};

const EventContact = ({ event = {}, onChangeEvent }) => {
  const { user } = useAuth();
  const { offcanvas, OffcanvasElement } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Typography.H2>Contact</Typography.H2>
      <Typography.Text>
        Add contact information for your event. You can change this at any time
        in the future.
      </Typography.Text>
      <Typography.H3 class="required">
        Contact Email
        <span className="text-danger">*</span>
      </Typography.H3>
      <Typography.Text>
        How should EventPilot contact your event?
      </Typography.Text>
      <SegmentedControl
        value={event.useUserEmailAsContact}
        onChange={(e) =>
          onChangeEvent({
            useUserEmailAsContact: e.id,
            contactEmail: e.id ? user?.email : event.contactEmail,
          })
        }
        items={[
          { label: "Use the email you use to log in", id: true },
          { label: "Use a different email", id: false },
        ]}
      />

      <div className="mt-3" />

      {event.useUserEmailAsContact === null ? (
        <></>
      ) : event.useUserEmailAsContact ? (
        <Typography.Text>
          Your event will use <u>{user?.email}</u> as the contact email. That
          means if EventPilot needs to get ahold of you, we will reach out to
          you at <u>{user?.email}</u>. If you want to use a different email,
          pick "Use a different email" above.
        </Typography.Text>
      ) : (
        <Input
          className="mb-3"
          value={event.contactEmail}
          onChange={(e) => onChangeEvent({ contactEmail: e })}
          label="Enter a different email"
          required
          placeholder="Contact Email"
          labelDescription={
            isEmail(event.contactEmail)
              ? ""
              : "Please enter a valid email address"
          }
        />
      )}

      <Typography.H3 class="required">
        Public Contact Method
        <span className="text-danger">*</span>
      </Typography.H3>
      <Typography.Text>
        You can choose to have EventPilot host a public email inbox for your
        event, accessible through your dashboard, or you can have your event's
        contact email publicly listed and be the way your participants,
        volunteers, and the public can contact your event.
      </Typography.Text>
      {/* <Button onClick={() => offcanvas({ content: <div>Hello</div> })}></Button> */}
      <a
        href="javascript:() => null"
        onClick={() =>
          offcanvas({ content: <HostedEmailComparisonPopoverContent /> })
        }
        className="d-block mb-3"
      >
        <Row gap={0.25} align="center">
          Understand the difference
          <Icon i="square-chevron-left" />
        </Row>
      </a>
      <SegmentedControl
        value={event.useHostedEmail}
        onChange={(e) =>
          onChangeEvent({
            useHostedEmail: e.id,
            externalContactEmail: e.id ? false : event.externalContactEmail,
          })
        }
        items={[
          {
            label: "I want to have EventPilot create an email inbox",
            id: true,
          },
          { label: "I already have an email that I want to use", id: false },
        ]}
      />
      <div className="mt-3" />
      {event.useHostedEmail === null ? (
        <></>
      ) : event.useHostedEmail ? (
        <></>
      ) : (
        <>
          <label
            className="form-check"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              className="form-check-input"
              type="checkbox"
              checked={event.willForwardEmail}
              onChange={(e) =>
                onChangeEvent({ willForwardEmail: e.target.checked })
              }
            />
            <span className="form-check-label" style={{ textAlign: "left" }}>
              I intend to set up a forwarding rule to forward emails to
              EventPilot (it's easy, and we will walk you through it after your
              event is created) <b>(recommended)</b>
            </span>
          </label>

          {!event.willForwardEmail && (
            <Alert
              variant="danger"
              className="mb-3"
              title="Standard Email without Forwarding"
            >
              <Typography.Text className="mb-0">
                You have chosen to use a standard email for your event, and are
                not using forwarding. This means that EventPilot will not be
                able to process your incoming emails, so you won't be able to:
                <ul>
                  <li>View emails in your dashboard</li>
                  <li>Associate emails with CRM contacts</li>
                  <li>Generate todo items from emails</li>
                </ul>
                You will just process emails like you would without EventPilot.
              </Typography.Text>
            </Alert>
          )}
          <Input
            className="mb-3"
            value={event.externalContactEmail}
            onChange={(e) => onChangeEvent({ externalContactEmail: e })}
            label="Enter the email address of your event"
            required
            placeholder="Contact Email"
            labelDescription={
              isEmail(event.externalContactEmail)
                ? ""
                : "Please enter a valid email address"
            }
          />
        </>
      )}
    </>
  );
};

const EventSocials = ({ event = {}, onChangeEvent, setStage }) => {
  return (
    <>
      <Typography.H2>Social Media</Typography.H2>
      <Typography.Text>
        Add social media links for your event. You can change this at any time
        in the future.
      </Typography.Text>
      <Alert variant="info" className="mt-3" title="Optional Section">
        <Typography.Text className="mb-0">
          This section is optional, and you can fill this out later.
        </Typography.Text>
        <Button onClick={() => setStage(4)} className="mt-3" variant="primary">
          Skip to the next step
        </Button>
      </Alert>
      <Input
        value={event.facebook}
        onChange={(e) => onChangeEvent({ facebook: e })}
        label="Facebook"
        placeholder="https://facebook.com/..."
        hint="Your Facebook profile URL"
        icon={<Icon i="brand-facebook" />}
      />
      <Input
        value={event.instagram}
        onChange={(e) => onChangeEvent({ instagram: e })}
        label="Instagram"
        placeholder="https://instagram.com/..."
        hint="Your Instagram profile URL"
        icon={<Icon i="brand-instagram" />}
      />
      <Input
        value={event.twitter}
        onChange={(e) => onChangeEvent({ twitter: e })}
        label="Twitter/X"
        placeholder="https://x.com/..."
        hint="Your Twitter profile URL"
        icon={<Icon i="brand-x" />}
      />
      <Input
        value={event.youtube}
        onChange={(e) => onChangeEvent({ youtube: e })}
        label="YouTube"
        placeholder="https://youtube.com/..."
        hint="Your YouTube profile URL"
        icon={<Icon i="brand-youtube" />}
      />
      <Input
        value={event.linkedin}
        onChange={(e) => onChangeEvent({ linkedin: e })}
        label="LinkedIn"
        placeholder="https://linkedin.com/..."
        hint="Your LinkedIn profile URL"
        icon={<Icon i="brand-linkedin" />}
      />
      <Input
        value={event.tiktok}
        onChange={(e) => onChangeEvent({ tiktok: e })}
        label="TikTok"
        placeholder="https://tiktok.com/..."
        hint="Your TikTok profile URL"
        icon={<Icon i="brand-tiktok" />}
      />
      <Input
        value={event.snapchat}
        onChange={(e) => onChangeEvent({ snapchat: e })}
        label="Snapchat"
        placeholder="https://snapchat.com/..."
        hint="Your Snapchat profile URL"
        icon={<Icon i="brand-snapchat" />}
      />
      <Input
        value={event.reddit}
        onChange={(e) => onChangeEvent({ reddit: e })}
        label="Reddit"
        placeholder="https://reddit.com/..."
        hint="Your Reddit profile URL"
        icon={<Icon i="brand-reddit" />}
      />
      <Input
        value={event.threads}
        onChange={(e) => onChangeEvent({ threads: e })}
        label="Threads"
        placeholder="https://threads.com/..."
        hint="Your Threads profile URL"
        icon={<Icon i="brand-threads" />}
      />
    </>
  );
};

const Finished = ({ event = {}, onChangeEvent }) => {
  return (
    <>
      <ReactConfetti recycle={false} numberOfPieces={1000} />
      <Alert variant="success" className="mb-3" title="Event Created">
        Congratulations! Your event has been created.
      </Alert>
      <Typography.Text>
        Your event has been created. Here is some important information and
        links to get you started.
      </Typography.Text>
      <Typography.H2>Event Dashboard</Typography.H2>
      <Typography.Text>
        Once you click continue, you will be taken to your event dashboard. This
        is your main headquarters for your event. As more starts to happen in
        your event, you will see analytics and prompts here to help you keep
        track of what is happening. For now though, lets take a tour to get you
        familiar with the dashboard.
      </Typography.Text>
      <Typography.H2>Hosted Email</Typography.H2>
      <Typography.Text>
        EventPilot hosts an email for your event. Any emails sent to your event
        will be put into an inbox you can access from the dashboard. You will be
        able to generate todo items from emails, and senders will be
        automatically added to your CRM.
        <Alert variant="info" className="mt-3" title="Your hosted email">
          Emails sent to{" "}
          <u>
            <i>anything</i>@{event.slug}.geteventpilot.com
          </u>{" "}
          will be sent into your event's inbox. The "anything" part of the email
          means you can use any prefix you want. Commonly, events use:
          <ul>
            <li>event@</li>
            <li>volunteer@</li>
            <li>webmaster@</li>
            <li>info@</li>
            <li>support@</li>
            <li>help@</li>
          </ul>
        </Alert>
      </Typography.Text>
      <Typography.H2>Hosted Website</Typography.H2>
      <Typography.Text>
        EventPilot hosts a simple website for your event. Much of this website
        is autogenerated from your event's data. You can customize the look and
        feel of the website by editing the event's website settings.
        <Alert variant="info" className="mt-3" title="Your hosted website">
          The website for your event is at{" "}
          <u>https://{event.slug}.geteventpilot.com</u>
        </Alert>
      </Typography.Text>
      <Typography.H2>Daily Digests</Typography.H2>
      <Typography.Text>
        EventPilot sends daily digests to your event's email inbox. These
        digests, sent at 8:00 PM EST, contain a summary of the day's
        registrations and upcoming todo items. These emails have been scheduled,
        but you can manually unsubscribe from these emails by going to your
        event's settings or by following the unsubscribe link in the email.
      </Typography.Text>
      <Typography.H2>Welcome to EventPilot!</Typography.H2>
      <Typography.Text>
        Congratulations on creating your event! We are excited to see what your
        event will turn out to be. If you have any questions, please don't
        hesitate to reach out to us at support@geteventpilot.com.
      </Typography.Text>
    </>
  );
};

const Submit = ({ event = {}, onChangeEvent, onSubmit, err, loading }) => {
  return (
    <>
      <Typography.H2>Submitting your event</Typography.H2>
      <Typography.Text>
        You are almost done! Click below to submit your event.
      </Typography.Text>
      <Button onClick={() => onSubmit()} className={"mt-3"} variant="primary">
        Submit
      </Button>
      {err && (
        <Alert variant="danger" className="mt-3" title="Error">
          Unable to validate the values you have entered. Please check your
          inputs.
        </Alert>
      )}
    </>
  );
};
