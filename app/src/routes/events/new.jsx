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
import {
  TzDateTime,
  TzPicker,
} from "../../../components/tzDateTime/tzDateTime";
import React from "react";
import ReactConfetti from "react-confetti";
import { isEmail } from "../../../util/isEmail";
import { Row } from "../../../util/Flex";
import { EventChecklist } from "../../../components/EventChecklist/EventChecklist";
import { useAuth } from "../../../hooks";
// Hosted email comparison is deprecated in favor of Google options
// import { HostedEmailComparisonPopoverContent } from "../../../components/HostedEmailComparison/HostedEmailComparison";
import { useEvents } from "../../../hooks/useEvents";
import toast from "react-hot-toast";
// Gmail connection is now initiated from the event dashboard, not here

export const NewEventPage = () => {
  const [event, setEvent] = useState({
    name: null,
    description: null,
    slug: null,
    defaultTz: null,
    logoFileId: null,
    bannerFileId: null,
    useUserEmailAsContact: null,
    // Deprecated hosted email flags retained to satisfy current API schema
    useHostedEmail: false,
    willForwardEmail: true,
    // Event email setup: 'connect' | 'workspace' | null
    emailSetupMethod: null,
    // Persist user's interest in Workspace provisioning (framework only)
    wantsWorkspaceAccount: false,
    instance: {
      name: null,
      startTime: null,
      endTime: null,
      startTimeTz: null,
      endTimeTz: null,
    },
  });
  window.setEvent = setEvent;
  const [stage, setStage] = useState(0);
  const { schema, mutationLoading, createEvent } = useEvents();
  const [err, setErr] = useState(null);

  const onChangeEvent = (e) => {
    setEvent({ ...event, ...e });
  };

  // Removed immediate Google OAuth redirect after event creation

  const onSubmit = async () => {
    try {
      const parsed = schema.parse(event);
      // Always create the event and navigate to the dashboard.
      // Gmail connection can be started from the dashboard checklist.
      await createEvent(parsed);
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
              <InstanceInfo event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 2 && (
              <EventContact event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 3 && (
              <EventAssets event={event} onChangeEvent={onChangeEvent} />
            )}
            {stage === 4 && (
              <EventSocials
                event={event}
                onChangeEvent={onChangeEvent}
                setStage={setStage}
              />
            )}
            {stage === 5 && (
              <Submit
                event={event}
                onChangeEvent={onChangeEvent}
                onSubmit={onSubmit}
                err={err}
                loading={mutationLoading}
              />
            )}
            {stage === 6 && (
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
              {stage < 5 && (
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

const InstanceInfo = ({ event = {}, onChangeEvent }) => {
  const updateInstance = (changes) =>
    onChangeEvent({ instance: { ...event.instance, ...changes } });

  return (
    <>
      <Typography.H2>Instance</Typography.H2>
      <Typography.Text>
        Most events occur multiple times, whether that is a yearly occurrence,
        monthly, or on some other basis. EventPilot uses Instances to track
        different occurrences of your event. We will create your first instance
        for you, but once your event is over, you can add a new instance to
        track the next occurrence without having to create a new event or delete
        old data.
      </Typography.Text>
      <Input
        value={event.instance.name || ""}
        onChange={(e) => updateInstance({ name: e })}
        label="Instance Name"
        required
        placeholder="Instance Name (ideas: year, theme…)"
        hint="Required; at least 2 characters."
        labelDescription={
          event.instance?.name?.length < 2
            ? `${2 - event.instance?.name?.length} characters left`
            : event.instance?.name?.length > 50
            ? `${event.instance?.name?.length - 50} characters too long`
            : null
        }
      />
      <TzDateTime
        value={event.instance.startTime}
        onChange={([dt, tz]) =>
          updateInstance({ startTime: dt, startTimeTz: tz })
        }
        label="Start Date"
        required
        tz={event.instance.startTimeTz || event.defaultTz}
        minDate={
          event.instance?.startTime
            ? new Date(event.instance?.startTime).toISOString().slice(0, 10)
            : ""
        }
        minTime={
          event.instance?.startTime
            ? new Date(event.instance?.startTime).toISOString().slice(11, 16)
            : ""
        }
        defaultTime="00:00"
      />
      <TzDateTime
        value={event.instance.endTime}
        onChange={([dt, tz]) => updateInstance({ endTime: dt, endTimeTz: tz })}
        label="End Date"
        required
        tz={event.instance.endTimeTz || event.defaultTz}
        minDate={
          event.instance?.endTime
            ? new Date(event.instance?.endTime).toISOString().slice(0, 10)
            : ""
        }
        minTime={
          event.instance?.endTime
            ? new Date(event.instance?.endTime).toISOString().slice(11, 16)
            : ""
        }
        defaultTime="00:00"
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
        Event Email
        <span className="text-danger">*</span>
      </Typography.H3>
      <Typography.Text>
        Choose how your event will handle inbound email from the public.
      </Typography.Text>
      <SegmentedControl
        value={event.emailSetupMethod}
        onChange={(e) => {
          const next = e.id; // 'connect' | 'workspace'
          onChangeEvent({
            emailSetupMethod: next,
            wantsWorkspaceAccount: next === "workspace",
            // Ensure legacy fields satisfy the current API shape
            useHostedEmail: false,
            willForwardEmail: true,
            externalContactEmail: event.contactEmail || user?.email || event.externalContactEmail,
          });
        }}
        items={[
          {
            label: "Connect an existing Google account",
            id: "connect",
          },
          {
            label: "Get a Google Workspace account through EventPilot",
            id: "workspace",
          },
        ]}
      />
      <div className="mt-3" />
      {event.emailSetupMethod === "connect" && (
        <Alert variant="info" className="mb-3" title="Connect Google">
          <Typography.Text className="mb-0">
            After you create your event, connect your Google account from the
            setup checklist on your event dashboard. Once connected, your
            event’s public contact email will be set to that Gmail address.
          </Typography.Text>
        </Alert>
      )}
      {event.emailSetupMethod === "workspace" && (
        <Alert variant="warning" className="mb-3" title="Workspace provisioning">
          <Typography.Text className="mb-0">
            We’ll help you get a Google Workspace account provisioned for your event.
            This option is coming soon — we’ll follow up after your event is created.
          </Typography.Text>
        </Alert>
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
        <Button onClick={() => setStage(5)} className="mt-3" variant="primary">
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
      <Typography.H2>Email Setup</Typography.H2>
      <Typography.Text>
        If you chose to connect a Google account, you can start the connection
        from the setup checklist on your event dashboard (or from Settings → Gmail).
        After connecting, your event’s public contact email will be set to that Gmail address.
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
