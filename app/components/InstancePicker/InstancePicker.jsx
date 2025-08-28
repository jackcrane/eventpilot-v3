import React from "react";
import { useInstances } from "../../hooks/useInstances";
import { DropdownInput, Badge } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";

export const InstancePicker = ({
  eventId,
  onChange,
  setGlobalInstance = true,
  selectedInstanceId,
  showCreate = true,
  invalid = false,
}) => {
  const {
    instances,
    loading,
    createInstanceInteraction,
    CreateInstanceElement,
  } = useInstances({ eventId });

  const { instanceDropdownValue, setInstance } = useSelectedInstance();

  const handleChange = (id) => {
    console.log(id);
    if (id.id === "eventpilot__create") {
      createInstanceInteraction();
    } else {
      setGlobalInstance && setInstance(id);
      onChange && onChange(id);
    }
  };

  const items = [
    ...(instances ?? []).map((i) => ({
      id: i.id,
      label: (
        <Row gap={1}>
          {i.name}
          {i.active && (
            <Badge color="success" style={{ color: "white" }}>
              Active
            </Badge>
          )}
          {i.isNext && (
            <Badge color="primary" style={{ color: "white" }}>
              Upcoming
            </Badge>
          )}
          {i.endTime && new Date(i.endTime) < new Date() && (
            <Badge color="orange" style={{ color: "white" }}>
              Past
            </Badge>
          )}
        </Row>
      ),
      searchIndex: `${i.startTime ?? ""} ${i.name ?? ""}`,
    })),

    showCreate && {
      id: "eventpilot__create",
      label: "Create new instance",
      searchIndex: "create",
    },
  ].filter(Boolean);

  return (
    <>
      <DropdownInput
        value={selectedInstanceId || instanceDropdownValue}
        onChange={handleChange}
        prompt={loading ? "Loading instances..." : "Pick an instance"}
        items={items}
        disabled={loading}
        aprops={{
          style: invalid ? { borderColor: "var(--tblr-danger)" } : null,
        }}
      />
      {showCreate && CreateInstanceElement}
    </>
  );
};
