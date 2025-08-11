import React from "react";
import { useInstances } from "../../hooks/useInstances";
import { DropdownInput, Badge } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";

export const InstancePicker = ({ eventId, onChange }) => {
  const { instances, loading, createInstance } = useInstances({ eventId });
  const { instanceDropdownValue, setInstance } = useSelectedInstance();

  return (
    <DropdownInput
      value={instanceDropdownValue}
      onChange={(i) => setInstance(i)}
      prompt="Pick an instance"
      items={instances?.map((i) => ({
        id: i.id,
        // label: i.name,
        label: (
          <Row gap={1}>
            {i.name}
            {i.active && (
              <Badge
                color="success"
                style={{
                  color: "white",
                }}
              >
                Active
              </Badge>
            )}
            {i.isNext && (
              <Badge color="primary" style={{ color: "white" }}>
                Upcoming
              </Badge>
            )}
            {new Date(i.endTime) < new Date() && (
              <Badge
                color="danger"
                style={{
                  color: "white",
                }}
              >
                Past
              </Badge>
            )}
          </Row>
        ),
        searchIndex: `${i.startTime} ${i.name}`,
      }))}
    />
  );
};
