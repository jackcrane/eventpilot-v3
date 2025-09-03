import React from "react";
import { useInstances } from "../../hooks/useInstances";
import { DropdownInput, Badge, Typography, useOffcanvas } from "tabler-react-2";
import { Col, Row } from "../../util/Flex";
import { useSelectedInstance } from "../../contexts/SelectedInstanceContext";
import { Icon } from "../../util/Icon";
import { formatDate } from "../tzDateTime/tzDateTime";
import { InstanceCRUD } from "../InstanceCRUD/InstanceCRUD";
import { InstanceManager } from "../InstanceManager/InstanceManager";

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
    deleteInstanceById,
    DeleteConfirmElement,
  } = useInstances({ eventId });

  const { instanceDropdownValue, setInstance } = useSelectedInstance();
  // useInstances handles list mutation; no local listKey needed here

  const {
    offcanvas: openEditor,
    OffcanvasElement: EditOffcanvasElement,
    close: closeEditor,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
  });
  const { offcanvas: openManage, OffcanvasElement: ManageOffcanvasElement } =
    useOffcanvas({
      offcanvasProps: { position: "end", size: 500, zIndex: 1050 },
    });

  // Confirm modal provided by useInstances

  const handleChange = (id) => {
    if (id.id === "eventpilot__create") {
      createInstanceInteraction();
    } else if (id.id === "eventpilot__manage") {
      // Open manage list in an offcanvas, then allow launching editor offcanvas inside it
      setTimeout(() =>
        openManage({
          content: (
            <InstanceManager
              eventId={eventId}
              onCreate={() => createInstanceInteraction()}
              onDelete={(id) => deleteInstanceById(id)}
              onEdit={(instanceId) =>
                openEditor({
                  content: (
                    <InstanceCRUD
                      eventId={eventId}
                      instanceId={instanceId}
                      mode="edit"
                      close={closeEditor}
                    />
                  ),
                })
              }
            />
          ),
        }),
      0);
    } else {
      setGlobalInstance && setInstance(id);
      onChange && onChange(id);
    }
  };

  const sorted = [...(instances ?? [])].sort((a, b) => {
    // Active first
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;

    // Upcoming second
    if (a.isNext && !b.isNext) return -1;
    if (!a.isNext && b.isNext) return 1;

    // Past last
    const aPast = a.endTime && new Date(a.endTime) < new Date();
    const bPast = b.endTime && new Date(b.endTime) < new Date();
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;

    // Otherwise sort by startTime
    return new Date(a.startTime ?? 0) - new Date(b.startTime ?? 0);
  });

  const items = [
    ...(sorted ?? [])
      .map((i) => ({
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
        dropdownText: (
          <Row gap={1}>
            <Col align="flex-start">
              <Row gap={1}>
                <span style={{ fontWeight: 500 }}>{i.name}</span>
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
              {i.startTime && (
                <Row gap={1}>
                  <Typography.Text
                    className="text-secondary mb-0"
                    style={{ fontSize: "0.7rem" }}
                  >
                    {formatDate(i.startTime, i.startTimeTz, "M/D/YY")} -{" "}
                    {formatDate(i.endTime, i.startTimeTz, "M/D/YY")}
                  </Typography.Text>
                </Row>
              )}
            </Col>
          </Row>
        ),
        searchIndex: `${i.startTime ?? ""} ${i.name ?? ""}`,
      }))
      .filter(Boolean),

    showCreate && {
      type: "divider",
    },

    showCreate && {
      id: "eventpilot__create",
      label: (
        <Row gap={1}>
          <Icon i="plus" size={16} />
          <span>Create new instance</span>
        </Row>
      ),
      searchIndex: "create",
    },

    showCreate && {
      id: "eventpilot__manage",
      label: (
        <Row gap={1}>
          <Icon i="edit" size={16} />
          <span>Edit or delete an instance</span>
        </Row>
      ),
      searchIndex: "manage",
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
      {EditOffcanvasElement}
      {ManageOffcanvasElement}
      {DeleteConfirmElement}
    </>
  );
};
