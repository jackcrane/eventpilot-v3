import { DropdownInput } from "tabler-react-2";
import { useCampaigns } from "../../hooks/useCampaigns";
import { useParams } from "react-router-dom";

export const CampaignPicker = ({
  includeCreateOption = true,
  onChange,
  value,
  go = false,
}) => {
  const {
    campaigns,
    loading,
    createCampaignModal,
    CreateCampaignModalElement,
  } = useCampaigns();

  const { eventId } = useParams();

  const items = campaigns?.length
    ? [
        ...campaigns.map((item) => ({
          label: item.name,
          value: item.id,
          id: item.id,
        })),
        includeCreateOption && {
          label: "Create new campaign",
          value: "create",
          id: "create",
        },
      ].filter((item) => item)
    : [
        includeCreateOption && {
          label: "Create new campaign",
          value: "create",
          id: "create",
        },
      ];

  const onInternalChange = (value) => {
    if (value.value === "create") {
      createCampaignModal();
    } else {
      if (go) {
        document.location.href = `/events/${eventId}/campaigns/${value.value}`;
      }
      onChange && onChange(value);
    }
  };

  return (
    <>
      {CreateCampaignModalElement}
      <DropdownInput
        loading={loading}
        items={items}
        prompt="Pick a campaign"
        value={value}
        onChange={onInternalChange}
      />
    </>
  );
};
