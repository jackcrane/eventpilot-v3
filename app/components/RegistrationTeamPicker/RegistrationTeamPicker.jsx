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
import { useTeamCodeLookup } from "../../hooks/useTeamCodeLookup";

// value shape: { id: string|null, code: string }
export const RegistrationTeamPicker = ({
  eventId,
  value,
  onChange,
  label = "Team",
  required = false,
}) => {
  const { teams, loading } = usePublicTeams({ eventId });
  const [code, setCode] = useState("");
  const [confirmedTeam, setConfirmedTeam] = useState(null);
  const { lookup, loading: lookupLoading, reset: resetLookup } =
    useTeamCodeLookup({ eventId });

  const publicTeams = useMemo(
    () => (teams || []).filter((t) => t.public),
    [teams]
  );

  const items = useMemo(
    () =>
      publicTeams.map((t) => ({
        id: t.id,
        value: t.id,
        label: t.name,
        disabled: !t.available,
      })),
    [publicTeams]
  );

  const handleSelect = (sel) => {
    const id = sel?.value ?? sel?.id ?? null;
    if (!id) return;
    const team = publicTeams.find((t) => t.id === id);
    if (!team?.available) {
      toast.error("That team is full");
      setConfirmedTeam(null);
      onChange?.({ id: null, code: "" });
      return;
    }
    setConfirmedTeam(team || { id, name: "Selected team" });
    onChange?.({ id, code: "" });
  };

  const handleLookup = async () => {
    const entered = (code || value?.code || "").trim();
    if (!entered) return;
    const data = await lookup(entered);
    if (data?.team) {
      if (!data.team.available) {
        toast.error("That team is full");
        setCode("");
        setConfirmedTeam(null);
        onChange?.({ id: null, code: "" });
        return;
      }
      setConfirmedTeam(data.team);
      // For code-join, keep id null so server uses code path (allows private teams)
      onChange?.({ id: null, code: entered });
    } else {
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
              resetLookup();
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
      <label className={`form-label ${required ? "required" : ""}`}>
        {label || "Team"}
      </label>
      {publicTeams.filter((t) => t.available).length > 0 ? (
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
              <Button onClick={handleLookup} loading={lookupLoading}>
                Join
              </Button>
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
          <Button onClick={handleLookup} loading={lookupLoading}>
            Join
          </Button>
        </Row>
      )}
    </div>
  );
};
