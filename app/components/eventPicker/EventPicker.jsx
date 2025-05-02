import { useEvents } from "../../hooks/useEvents";
import { DropdownInput } from "tabler-react-2";
import { Row } from "../../util/Flex";

export const EventPicker = ({
  includeCreateOption = true,
  onChange,
  value,
  go = false,
}) => {
  const { events, loading, createEventModal, CreateEventModalElement } =
    useEvents();
  const items = events?.length
    ? [
        ...events.map((item) => ({
          // label: item.name,
          label: (
            <Row data-data={JSON.stringify(item)} gap={1}>
              <img
                src={item.logo?.location}
                alt="Event Logo"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  objectFit: "cover",
                  lineHeight: 0,
                  transform: "scale(1.3)",
                }}
              />
              {item.name}
            </Row>
          ),
          value: item.id,
          id: item.id,
        })),
        includeCreateOption && {
          label: "Create new event",
          value: "create",
          id: "create",
        },
      ].filter((item) => item)
    : [
        includeCreateOption && {
          label: "Create new event",
          value: "create",
          id: "create",
        },
      ];

  const onInternalChange = (value) => {
    if (value.value === "create") {
      createEventModal();
    } else {
      if (go) {
        document.location.href = `/${value.value}`;
      }
      onChange && onChange(value);
    }
  };

  return (
    <>
      {CreateEventModalElement}
      <DropdownInput
        loading={loading}
        items={items}
        prompt="Pick an event"
        value={value}
        onChange={onInternalChange}
      />
    </>
  );
};
