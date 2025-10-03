import { useMemo } from "react";
import { Badge, Button, Table, Typography } from "tabler-react-2";
import { Row } from "../../util/Flex";

export const ProvisionerTable = ({
  provisioners,
  permissionLabels,
  shownPins,
  knownPins,
  onRevealPin,
  onEditProvisioner,
  emptyMessage,
}) => {
  const columns = useMemo(
    () => [
      {
        label: "Name",
        accessor: "name",
        render: (value) => value || "—",
      },
      {
        label: "Permissions",
        accessor: "permissions",
        render: (values = []) => (
          <Row gap={0.5} wrap>
            {values.map((permission) => (
              <Badge key={permission} soft color="purple">
                {permissionLabels.get(permission) || permission}
              </Badge>
            ))}
          </Row>
        ),
      },
      {
        label: "Account count",
        accessor: "accountCount",
        render: (value) => value ?? 0,
      },
      {
        label: "Pin",
        accessor: "id",
        render: (_, row) => {
          const value = knownPins[row.id] ?? row.pin;
          const isShown = shownPins[row.id];
          if (isShown && value) {
            return (
              <span style={{ fontFamily: "var(--tblr-font-monospace)" }}>
                {value}
              </span>
            );
          }
          return (
            <Button
              size="sm"
              variant="subtle"
              disabled={!value}
              onClick={() => onRevealPin(row, value)}
            >
              Show PIN
            </Button>
          );
        },
      },
      {
        label: "",
        accessor: "actions",
        render: (_, row) => (
          <Button size="sm" onClick={() => onEditProvisioner(row)}>
            Modify
          </Button>
        ),
      },
    ],
    [permissionLabels, shownPins, knownPins, onRevealPin, onEditProvisioner]
  );

  if (!provisioners.length) {
    return (
      <Typography.Text className="text-muted">{emptyMessage}</Typography.Text>
    );
  }

  return <Table className="card" columns={columns} data={provisioners} />;
};
