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
  teams: overrideTeams,
  loading: loadingProp,
  showPublicOnly = true,
  onTeamSelection,
  showCodeInput = true,
  showConfirmation = true,
  disableUnavailable = true,
}) => {
  const { teams: publicTeams, loading: publicLoading } = usePublicTeams({
    eventId,
  });
  const [code, setCode] = useState("");
  const [confirmedTeam, setConfirmedTeam] = useState(null);
  const { lookup, loading: lookupLoading, reset: resetLookup } =
    useTeamCodeLookup({ eventId });

  const availableTeams = overrideTeams ?? publicTeams ?? [];
  const loading = overrideTeams ? Boolean(loadingProp) : publicLoading;

  const visibleTeams = useMemo(
    () =>
      showPublicOnly
        ? availableTeams.filter((team) => team.public)
        : availableTeams,
    [availableTeams, showPublicOnly]
  );

  const items = useMemo(
    () =>
      visibleTeams.map((t) => ({
        id: t.id,
        value: t.id,
        label: t.name,
        disabled: disableUnavailable ? !t.available : false,
      })),
    [visibleTeams, disableUnavailable]
  );

  const handleSelect = (sel) => {
    const id = sel?.value ?? sel?.id ?? null;
    if (!id) return;
    const team = visibleTeams.find((t) => t.id === id);
    if (!team?.available) {
      toast.error("That team is full");
      setConfirmedTeam(null);
      onChange?.({ id: null, code: "" });
      onTeamSelection?.({ team: null, code: "", status: "clear" });
      return;
    }
    const confirmed = team || { id, name: "Selected team" };
    if (showConfirmation) setConfirmedTeam(confirmed);
    onChange?.({ id, code: "" });
    if (!showConfirmation) setConfirmedTeam(null);
    onTeamSelection?.({ team: confirmed, code: "", status: "select" });
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
      if (showConfirmation) setConfirmedTeam(data.team);
      // For code-join, keep id null so server uses code path (allows private teams)
      onChange?.({ id: null, code: entered });
      onTeamSelection?.({
        team: data.team,
        code: entered,
        status: "lookup",
      });
    } else {
      toast.error("Invalid team code");
    }
  };

  if (loading) return <div>Loading...</div>;

  if (showConfirmation && confirmedTeam) {
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
              onTeamSelection?.({ team: null, code: "", status: "clear" });
            }}
          >
            Undo
          </Button>
        </Row>
      </Alert>
    );
  }

  const selectedId = value?.id ?? value?.value ?? value?.teamId ?? null;
  const dropdownElement = (
    <DropdownInput
      items={items}
      prompt={showPublicOnly ? "Pick a public team" : "Pick a team"}
      value={selectedId ? { id: selectedId } : undefined}
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
  );

  const codeInputElement = (
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
  );

  return (
    <div>
      <label className={`form-label ${required ? "required" : ""}`}>
        {label || "Team"}
      </label>
      {visibleTeams.length > 0 ? (
        <Row gap={2} align="center">
          {dropdownElement}
          {showCodeInput && (
            <>
              <Typography.Text className="mb-0">or</Typography.Text>
              {codeInputElement}
            </>
          )}
        </Row>
      ) : showCodeInput ? (
        <Row gap={1} align="center">
          {codeInputElement}
        </Row>
      ) : (
        <Typography.Text className="text-muted">
          No teams available.
        </Typography.Text>
      )}
    </div>
  );
};
