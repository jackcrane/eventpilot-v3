import React, { useMemo, useState } from "react";
import {
  Input,
  Typography,
  Alert,
  DropdownInput,
  Button,
} from "tabler-react-2";
import { usePublicTeams } from "../../hooks/usePublicTeams";
import { Row } from "../../util/Flex";
import toast from "react-hot-toast";

// value shape: { id: string|null, code: string }
export const RegistrationTeamPicker = ({ eventId, value, onChange }) => {
  const { teams, loading } = usePublicTeams({ eventId });
  const [code, setCode] = useState("");
  const [confirmedTeam, setConfirmedTeam] = useState(null);

  const availablePublicTeams = useMemo(
    () => (teams || []).filter((t) => t.public && t.available),
    [teams]
  );

  const items = useMemo(
    () =>
      availablePublicTeams.map((t) => ({
        id: t.id,
        value: t.id,
        label: t.name,
        disabled: false,
      })),
    [availablePublicTeams]
  );

  const handleSelect = (sel) => {
    const id = sel?.value ?? sel?.id ?? null;
    if (!id) return;
    const team = availablePublicTeams.find((t) => t.id === id);
    setConfirmedTeam(team || { id, name: "Selected team" });
    onChange?.({ id, code: "" });
  };

  const handleLookup = async () => {
    const entered = (code || value?.code || "").trim();
    if (!entered) return;
    try {
      const res = await fetch(
        `/api/events/${eventId}/registration/team/lookup?code=${encodeURIComponent(
          entered
        )}`,
        {
          headers: { "X-Instance": localStorage.getItem("instance") },
        }
      );
      if (!res.ok) throw new Error("not-found");
      const data = await res.json();
      setConfirmedTeam(data.team);
      onChange?.({ id: data.team.id, code: "" });
    } catch (e) {
      toast.error("Invalid team code");
    }
  };

  if (loading) return <div>Loading...</div>;

  if (confirmedTeam) {
    return (
      <Alert variant="secondary" title="Team selected">
        <Row gap={1} justify="space-between" align="center">
          <Typography.Text className="mb-0">
            You will join team: <b>{confirmedTeam.name}</b>
          </Typography.Text>
          <Button
            size="sm"
            outline
            onClick={() => {
              setConfirmedTeam(null);
              setCode("");
              onChange?.({ id: null, code: "" });
            }}
          >
            Undo
          </Button>
        </Row>
      </Alert>
    );
  }

  return (
    <div>
      <label className="form-label required">Team</label>
      {availablePublicTeams.length > 0 ? (
        <>
          <Row gap={2} align="center">
            <DropdownInput
              items={items}
              prompt="Pick a public team"
              value={value?.id ? { value: value.id } : undefined}
              onChange={handleSelect}
              aprops={{
                style: {
                  flex: 1,
                  textAlign: "left",
                  justifyContent: "space-between",
                },
              }}
              style={{ flex: 1, display: "flex" }}
            />
            <Typography.Text className="mb-0">or</Typography.Text>
            <Row gap={1} align="center" style={{ flex: 1 }}>
              <Input
                placeholder="Enter team code"
                value={code}
                onChange={setCode}
                className="mb-0"
                style={{ flex: 1 }}
              />
              <Button onClick={handleLookup}>Join</Button>
            </Row>
          </Row>
        </>
      ) : (
        <Row gap={1} align="center">
          <Input
            placeholder="Enter team code"
            value={code}
            onChange={setCode}
            className="mb-0"
            style={{ flex: 1 }}
          />
          <Button onClick={handleLookup}>Join</Button>
        </Row>
      )}
    </div>
  );
};
