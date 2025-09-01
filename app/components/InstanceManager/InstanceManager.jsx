import React from "react";
import { Badge, Button, Card, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { formatDate } from "../tzDateTime/tzDateTime";
import { authFetch } from "../../util/url";
import toast from "react-hot-toast";
import { Icon } from "../../util/Icon";

export const InstanceManager = ({
  instances = [],
  loading = false,
  eventId,
  instanceDropdownValue,
  setInstance,
  confirm,
  mutate,
  listKey,
  onEdit, // function (instanceId) => void
  onCreate, // function () => void
}) => {
  const canDelete = (instances?.length ?? 0) > 1;

  const handleDelete = async (i) => {
    if (!canDelete) return;
    if (!(await confirm())) return;
    try {
      const deletingCurrent = i.id === instanceDropdownValue?.id;
      let nextCandidate = null;
      if (deletingCurrent) {
        const now = new Date();
        const remaining = (instances ?? []).filter((x) => x.id !== i.id);
        const nextFlagged = remaining.find((x) => x.isNext);
        const future = remaining
          .filter(
            (x) =>
              x?.startTime && new Date(x.startTime).getTime() >= now.getTime()
          )
          .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const past = remaining
          .filter(
            (x) => x?.endTime && new Date(x.endTime).getTime() < now.getTime()
          )
          .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));
        const fallbackPastByStart = remaining
          .filter(
            (x) =>
              x?.startTime && new Date(x.startTime).getTime() < now.getTime()
          )
          .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        nextCandidate =
          nextFlagged ||
          future?.[0] ||
          past?.[0] ||
          fallbackPastByStart?.[0] ||
          remaining?.[0] ||
          null;
      }

      const promise = authFetch(`/api/events/${eventId}/instances/${i.id}`, {
        method: "DELETE",
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });
      await toast.promise(promise, {
        loading: "Deleting...",
        success: "Deleted successfully",
        error: "Error deleting",
      });
      await mutate(listKey);
      if (nextCandidate) setInstance(nextCandidate.id);
    } catch (e) {}
  };

  return (
    <div style={{ minWidth: 360 }}>
      <Typography.H5 className="mb-0 text-secondary">INSTANCES</Typography.H5>
      <Typography.H1 className="mb-0">Manage instances</Typography.H1>
      {loading && <Typography.Text>Loading instances…</Typography.Text>}
      {!loading && (!instances || instances.length === 0) && (
        <Typography.Text>No instances found.</Typography.Text>
      )}
      <div className="mb-3"></div>
      {!loading && instances && instances.length > 0 && (
        <div style={{ maxHeight: 420, overflowY: "auto" }} className="mb-3">
          {[...(instances ?? [])]
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
                      onClick={() => handleDelete(i)}
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
