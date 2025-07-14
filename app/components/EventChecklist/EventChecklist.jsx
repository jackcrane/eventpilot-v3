import { Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { isEmail } from "../../util/isEmail";

export const generateSections = (event) => {
  return [
    {
      title: "Basic Information",
      stage: 0,
      optional: false,
      items: [
        {
          key: "name",
          label: "Event Name",
          validate: (val) => val && val.length >= 2,
        },
        {
          key: "description",
          label: "Event Description",
          validate: (val) => val && val.length >= 10,
        },
        { key: "slug", label: "Event Slug", validate: (val) => !!val },
        {
          key: "defaultTz",
          label: "Default Timezone",
          validate: (val) => !!val,
        },
      ],
    },
    {
      title: "Contact Information",
      stage: 1,
      optional: false,
      items: [
        {
          key: "useUserEmailAsContact",
          label: "Contact Email",
          validate: (val, event) => !!val || isEmail(event.contactEmail),
        },
        {
          key: "useHostedEmail",
          label: "Standard or Hosted Email",
          validate: (val) => typeof val === "boolean",
        },
        event.useHostedEmail !== true && {
          key: "externalContactEmail",
          label: "External Contact Email",
          validate: (val) => !!val && isEmail(event.externalContactEmail),
        },
      ].filter(Boolean),
    },
    {
      title: "Assets",
      stage: 2,
      optional: false,
      items: [
        { key: "logoFileId", label: "Logo Image", validate: (val) => !!val },
        {
          key: "bannerFileId",
          label: "Banner Image",
          validate: (val) => !!val,
        },
      ],
    },
    {
      title: "Social Media",
      stage: 3,
      optional: true,
      items: [
        { key: "facebook", label: "Facebook" },
        { key: "instagram", label: "Instagram" },
        { key: "twitter", label: "Twitter/X" },
        { key: "youtube", label: "YouTube" },
        { key: "linkedin", label: "LinkedIn" },
        { key: "tiktok", label: "TikTok" },
        { key: "snapchat", label: "Snapchat" },
        { key: "reddit", label: "Reddit" },
        { key: "threads", label: "Threads" },
      ],
    },
  ];
};

export const EventChecklist = ({ event, setStage }) => {
  const sections = generateSections(event);

  return (
    <div>
      {sections.map((section) => (
        <Typography.Text key={section.title} className="d-block mb-3">
          <a onClick={() => setStage(section.stage)} href="#">
            {section.title}
          </a>
          {section.optional && (
            <Typography.Text className="text-muted d-block mb-1">
              Social media links are optional.
            </Typography.Text>
          )}

          {section.items.map((item) => {
            const value = event[item.key];
            const valid = item.validate ? item.validate(value, event) : !!value;
            const iconName = valid
              ? "check"
              : section.optional
              ? "percentage-0"
              : "x";
            const color = valid ? "green" : section.optional ? "grey" : "red";

            return (
              <Typography.Text className="mb-0" key={item.key}>
                <Row align="center" gap={1}>
                  <Icon i={iconName} size={16} color={color} />
                  {item.label}
                </Row>
              </Typography.Text>
            );
          })}
        </Typography.Text>
      ))}
    </div>
  );
};
