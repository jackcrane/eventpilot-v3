import React from "react";
import { Badge, Button, Card, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { formatDate } from "../tzDateTime/tzDateTime";
import { Icon } from "../../util/Icon";
import { useInstances } from "../../hooks/useInstances";

export const InstanceManager = ({
  eventId = null,
  instances = [],
  loading = false,
  onEdit, // function (instanceId) => void
  onCreate, // function () => void
  onDelete, // function (instanceId) => void
}) => {
  // If eventId is provided, fetch live instances so this view updates with SWR
  const hook = eventId ? useInstances({ eventId }) : null;
  const resolvedInstances = eventId ? hook?.instances ?? [] : instances;
  const resolvedLoading = eventId ? hook?.loading ?? false : loading;
  const deleteViaHook = eventId ? hook?.deleteInstanceById : null;

  const canDelete = (resolvedInstances?.length ?? 0) > 1;

  return (
    <div style={{ minWidth: 360 }}>
      <Typography.H5 className="mb-0 text-secondary">INSTANCES</Typography.H5>
      <Typography.H1 className="mb-0">Manage instances</Typography.H1>
      {resolvedLoading && <Typography.Text>Loading instances…</Typography.Text>}
      {!resolvedLoading && (!resolvedInstances || resolvedInstances.length === 0) && (
        <Typography.Text>No instances found.</Typography.Text>
      )}
      <div className="mb-3"></div>
      {!resolvedLoading && resolvedInstances && resolvedInstances.length > 0 && (
        <div style={{ maxHeight: 420, overflowY: "auto" }} className="mb-3">
          {[...(resolvedInstances ?? [])]
            .sort((a, b) => {
              if (a.active && !b.active) return -1;
              if (!a.active && b.active) return 1;
              if (a.isNext && !b.isNext) return -1;
              if (!a.isNext && b.isNext) return 1;
              const aPast = a.endTime && new Date(a.endTime) < new Date();
              const bPast = b.endTime && new Date(b.endTime) < new Date();
              if (aPast && !bPast) return 1;
              if (!aPast && bPast) return -1;
              return new Date(a.startTime ?? 0) - new Date(b.startTime ?? 0);
            })
            .map((i) => (
              <Card key={i.id} className="p-0 mb-2">
                <Row gap={1} justify="space-between">
                  <div>
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
                      <Typography.Text
                        className="text-secondary mb-0"
                        style={{ fontSize: "0.7rem" }}
                      >
                        {formatDate(i.startTime, i.startTimeTz, "M/D/YY")} -{" "}
                        {formatDate(i.endTime, i.startTimeTz, "M/D/YY")}
                      </Typography.Text>
                    )}
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: 8 }}>
                    <Button size="sm" outline onClick={() => onEdit(i.id)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      color="red"
                      outline
                      disabled={!canDelete}
                      onClick={() => (onDelete ? onDelete(i.id) : deleteViaHook?.(i.id))}
                    >
                      Delete
                    </Button>
                  </div>
                </Row>
              </Card>
            ))}
        </div>
      )}
      <Button onClick={onCreate}>
        <Icon i="plus" /> Create new instance
      </Button>
    </div>
  );
};
