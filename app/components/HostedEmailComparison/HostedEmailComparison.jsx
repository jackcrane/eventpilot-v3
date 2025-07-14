import React from "react";
import { Typography, Alert } from "tabler-react-2";
import { Icon } from "../../util/Icon";

const Check = () => <Icon i="circle-check-filled" color="green" size={16} />;
const X = () => <Icon i="circle-x-filled" color="red" size={16} />;

const comparisonData = [
  {
    feature: "Email an individual",
    hosted: <Check />,
    standard: <Check />,
  },
  {
    feature: "Send an email blast",
    hosted: <Check />,
    standard: <X />,
  },
  {
    feature: "Receive an email right the dashboard",
    hosted: <Check />,
    standard: <X />,
  },
  {
    feature: "Automatically add senders to your CRM",
    hosted: <Check />,
    standard: <X />,
  },
  {
    feature: "View a person's CRM information right next to their email",
    hosted: <Check />,
    standard: <X />,
  },
  {
    feature: "Generate todo items from emails",
    hosted: <Check />,
    standard: <X />,
  },
  {
    feature:
      "Manage multiple inboxes in one place (e.g. volunteer@, info@, etc.)",
    hosted: <Check />,
    standard: <X />,
  },
];

export const HostedEmailComparisonPopoverContent = () => (
  <>
    <Typography.H5 className="mb-0 text-secondary">HOSTED EMAIL</Typography.H5>
    <Typography.H1>
      Understand how an EventPilot hosted email differs from a standard email.
    </Typography.H1>
    <Typography.Text>
      You can pick whether you want to have EventPilot host a public-facing
      email inbox for your event, accessible through your dashboard, or you can
      have your event's contact email publicly listed.
    </Typography.Text>
    <Typography.Text>
      The EventPilot hosted email is accessible through your dashboard, whereas
      the standard email is just your "typical" email inbox you access through
      Gmail, Outlook, or your preferred email client.
    </Typography.Text>
    <Alert
      variant="info"
      className="mt-3"
      title="This is for human-to-human emails"
    >
      <Typography.Text className="mb-0">
        Your decision here is for human-to-human emails only. You will still be
        able to send marketing email blasts regardless of whether you choose to
        use EventPilot hosted email or not. This is just for the <i>inbox</i>{" "}
        that the public will reach you at.
      </Typography.Text>
    </Alert>
    <Typography.Text>
      There are benefits to having EventPilot host your inbox.
    </Typography.Text>

    <div className="table-responsive card">
      <table className="table table-vcenter table-bordered table-nowrap card-table">
        <thead>
          <tr>
            <th className="w-50"></th>
            <th>Hosted Email</th>
            <th>Standard Email</th>
          </tr>
        </thead>
        <tbody>
          {comparisonData.map(({ feature, hosted, standard }) => (
            <tr key={feature}>
              <td
                className="w-50"
                style={{ wordBreak: "break-word", whiteSpace: "normal" }}
              >
                {feature}
              </td>
              <td>{hosted}</td>
              <td>{standard}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);
