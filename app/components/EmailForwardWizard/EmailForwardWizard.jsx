import { useState } from "react";
import {
  Typography,
  SegmentedControl,
  Spinner,
  Card,
  Button,
  Alert,
  Util,
} from "tabler-react-2";
import addFwdAddy from "../../assets/add-a-forwarding-address.png";
import fwSettings from "../../assets/forwarding-settings.png";
import { useEvent } from "../../hooks/useEvent";
import { useParams } from "react-router-dom";
import { Loading } from "../loading/Loading";
import { Row } from "../../util/Flex";

export const EmailForwardWizard = () => {
  const [client, setClient] = useState("gmail");
  const { eventId } = useParams();
  const { event, loading, refetch } = useEvent({
    eventId,
    refreshInterval: 5000,
  });

  if (loading) return <Loading />;

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">
        EMAIL FORWARDING
      </Typography.H5>
      <Typography.H1>Set up email forwarding</Typography.H1>
      <Typography.Text>
        Your email client, like Gmail or Outlook, can automatically forward
        emails that are sent to you to EventPilot. This is useful if you want to
        use EventPilot's email inbox to manage your event's emails while still
        using your existing email client.
      </Typography.Text>
      {event.forwardEmailConfirmed && (
        <Alert variant="success" className="mt-3" title="Emails are set up">
          <Typography.Text className="mb-0">
            Your event is set up to automatically forward emails to EventPilot.
            You can continue and set up a different email routing, but as long
            as forwarding is set up in your email client, you will receive
            emails from your event.
          </Typography.Text>
        </Alert>
      )}
      <Typography.H2>Step 1: Pick your email client</Typography.H2>
      <SegmentedControl
        value={client}
        onChange={(e) => setClient(e.id)}
        items={[
          { label: "Gmail", id: "gmail" },
          { label: "Outlook", id: "outlook" },
        ]}
      />
      {client === "gmail" && (
        <>
          <Typography.H2 className="mt-3">
            Step 2: Nagivate to your Gmail settings
          </Typography.H2>
          <Typography.Text>
            Log in to your Google account and visit{" "}
            <a
              href="https://mail.google.com/#settings/fwdandpop"
              target="_blank"
            >
              https://mail.google.com/#settings/fwdandpop
            </a>
            , or log into your Gmail account and click the gear icon on the top
            right, then click on "See all settings", then click on "Forwarding
            and POP/IMAP"
          </Typography.Text>
          <Typography.H2 className="mt-3">
            Step 3: Enable forwarding
          </Typography.H2>
          <Typography.Text>
            You will see a button that says "Add a forwarding address":
          </Typography.Text>
          <img src={addFwdAddy} className="mt-3 card shadow-sm" />
          <Typography.Text className="mt-3">
            Click on the button, and it will ask you for an email address. Enter
            the following:
          </Typography.Text>
          <pre className="bg-gray-100 text-dark">{`forwarding@${event?.slug}.geteventpilot.com`}</pre>
          <Typography.H2 className="mt-3">
            Step 4: Authorize the change
          </Typography.H2>
          <Typography.Text>
            You will likely be asked to authorize the change by re-entering your
            Google password or reciving a verification text message. Once you
            re-log-in, you will see a very bare-bones webpage with a "Proceed"
            and "Cancel" button. Click "Proceed".
          </Typography.Text>
          <Typography.H2 className="mt-3">
            Step 5: Confirm the forwarding address
          </Typography.H2>
          <Typography.Text>
            Gmail will send EventPilot a confirmation link. This may take a few
            seconds to arrive once you have completed step 4. If it takes longer
            than 5 minutes, please reach out to support@geteventpilot.com.
          </Typography.Text>
          <Card
            variant={
              event?.forwardEmailConfirmationLink?.length > 1
                ? "success"
                : undefined
            }
          >
            {event?.forwardEmailConfirmationLink ? (
              <>
                <Typography.Text>
                  EventPilot has received and processed the confirmation link.
                  To continue, please click the link below:
                </Typography.Text>
                <a href={event?.forwardEmailConfirmationLink} target="_blank">
                  {event?.forwardEmailConfirmationLink}
                </a>
              </>
            ) : (
              <>
                <Row gap={1} align="center">
                  <Spinner />
                  <Typography.Text className="mb-0">
                    We are waiting for the confirmation link
                  </Typography.Text>
                  <div style={{ flex: 1 }} />
                  <Button size="sm" onClick={refetch} loading={loading}>
                    Check again
                  </Button>
                </Row>
              </>
            )}
          </Card>
          {event?.forwardEmailConfirmationLink?.length > 0 && (
            <>
              <Typography.H2 className="mt-3">
                Step 6: Confirm the forwarding address (pt. 2)
              </Typography.H2>
              <Typography.Text>
                On the webpage you just opened, there is a "Confirm" button.
                Click it, and you will receive a confirmation screen.
              </Typography.Text>
              <Typography.H2 className="mt-3">
                Step 7: Close the Gmail settings tab
              </Typography.H2>
              <Typography.Text>
                Thanks to a bug in Gmail, you will need to close the tab that
                has Gmail open.
              </Typography.Text>
              <Typography.H2 className="mt-3">
                Step 8: Re-open the Gmail forwarding settings
              </Typography.H2>
              <Typography.Text>
                Re-open the Gmail settings page (
                <a
                  href="https://mail.google.com/mail/u/0/#settings/fwdandpop"
                  target="_blank"
                >
                  https://mail.google.com/mail/u/0/#settings/fwdandpop
                </a>
                ).
              </Typography.Text>
              <Typography.H2 className="mt-3">
                Step 9: Enter the destination email address
              </Typography.H2>
              <Typography.Text>
                You will find the following settings on that page:
              </Typography.Text>
              <img src={fwSettings} className="mt-3 card shadow-sm" />
              <Typography.Text className="mt-3">
                There are 3 steps to entering the destination email address:
              </Typography.Text>
              <Typography.H3 className="mt-3">
                Step 1: Enable forwarding
              </Typography.H3>
              <Typography.Text>
                Click the round radio button next to "Forward a copy of incoming
                mail to...". It should become blue.
              </Typography.Text>
              <Typography.H3 className="mt-3">
                Step 2: Enter the destination email address
              </Typography.H3>
              <Typography.Text>
                Enter the EventPilot email address (copy from below) in the box
                labeled "(insert here)" in the screenshot above.
              </Typography.Text>
              <pre className="bg-gray-100 text-dark">{`forwarding@${event?.slug}.geteventpilot.com`}</pre>
              <Typography.H3 className="mt-3">
                Step 3: Pick gmail's behavior
              </Typography.H3>
              <Typography.Text>
                The dropdown input has 4 options. We recommend "archive Gmail's
                copy" to remove it from your Gmail inbox but not delete it, but
                all of these will work.
              </Typography.Text>
              <Typography.H2 className="mt-3">Step 10: Save</Typography.H2>
              <Typography.Text>
                Scroll down to the bottom of the page and click the "Save
                Changes" button.
              </Typography.Text>
              <Alert
                variant="info"
                className="mt-3"
                title="You may need try a few times"
              >
                Gmail's interface is very buggy. When you click save, you may
                get a popup telling you there was some issue saving. This is
                okay, try reloading the Gmail page and trying again. If you have
                any issues, please reach out to support@geteventpilot.com.
              </Alert>
              <Util.Hr className="mt-3" />
              <Alert variant="success" className="mt-3" title="Done!">
                Once you have saved your work, you are done! You can close the
                Gmail window and return to EventPilot.
              </Alert>
            </>
          )}
        </>
      )}
    </div>
  );
};
