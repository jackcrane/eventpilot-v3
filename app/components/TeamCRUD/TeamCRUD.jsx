import { Typography, Input, Checkbox, Button } from "tabler-react-2";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../loading/Loading";
import { useRegistrationTeams } from "../../hooks/useRegistrationTeams";
import { useRegistrationTeam } from "../../hooks/useRegistrationTeam";
import { useRegistrationFormRequirementPrompt } from "../../hooks/useRegistrationFormRequirementPrompt";

export const TeamCRUD = ({ team, onClose, registerRequirementModal, ...props }) => {
  if (team?.id) {
    return <TeamEdit teamId={team.id} onClose={onClose} {...props} />;
  }
  return (
    <TeamCreate
      onClose={onClose}
      registerRequirementModal={registerRequirementModal}
      {...props}
    />
  );
};

const TeamCreate = ({ onClose, registerRequirementModal }) => {
  const { eventId } = useParams();
  const { mutationLoading, createTeam, validationError } =
    useRegistrationTeams({ eventId });
  const {
    ensureRequirement: ensureTeamPicker,
    RequirementModalElement: TeamPickerRequirementModal,
  } = useRegistrationFormRequirementPrompt({
    eventId,
    fieldType: "team",
    modalTitle: "Add a team picker",
    modalText:
      "Your team has been created. In order for participants to join it, you must add a team picker to your registration form.",
    todoTitle: "Add team picker to registration form",
    todoContent:
      "Create a team picker section in the participant registration form so newly created teams can be joined.",
    newPageName: "Team Selection",
    buildField: () => ({
      label: "Team",
      description: "Let participants pick or join a team.",
      required: false,
    }),
  });

  useEffect(() => {
    if (!registerRequirementModal) return undefined;
    registerRequirementModal((prev) =>
      prev === TeamPickerRequirementModal ? prev : TeamPickerRequirementModal
    );
    return () => registerRequirementModal(null);
  }, [registerRequirementModal, TeamPickerRequirementModal]);

  return (
    <>
      {!registerRequirementModal && TeamPickerRequirementModal}
      <_TeamCRUD
        value={null}
        onClose={onClose}
        mutationLoading={mutationLoading}
        validationError={validationError}
        onFinish={createTeam}
        onSuccess={async () => {
          const action = await ensureTeamPicker({
            onBeforeNavigate: () => onClose?.(),
          });
          if (action === "goto") return false;
          return true;
        }}
      />
    </>
  );
};

const TeamEdit = ({ teamId, onClose }) => {
  const { eventId } = useParams();
  const { team, loading, mutationLoading, validationError, updateTeam } =
    useRegistrationTeam({ eventId, teamId });

  if (loading) return <Loading />;

  return (
    <_TeamCRUD
      value={team}
      onClose={onClose}
      mutationLoading={mutationLoading}
      validationError={validationError}
      onFinish={updateTeam}
    />
  );
};

const _TeamCRUD = ({
  value,
  onClose,
  mutationLoading,
  validationError,
  onFinish,
  onSuccess,
}) => {
  const [team, setTeam] = useState(value || { maxSize: null });
  const [limitSize, setLimitSize] = useState(Boolean(value?.maxSize));

  useEffect(() => {
    setTeam(value || { maxSize: null });
    setLimitSize(Boolean(value?.maxSize));
  }, [value]);

  const handleSubmit = async () => {
    const payload = {
      name: team.name,
      code: team.code,
      maxSize: limitSize ? parseInt(team.maxSize ?? 1, 10) : null,
      public: Boolean(team.public),
    };
    if (await onFinish(payload)) {
      const shouldClose = (await onSuccess?.()) ?? true;
      if (shouldClose) onClose?.();
    }
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">TEAM</Typography.H5>
      <Typography.H1>{value?.name || "New Team"}</Typography.H1>

      <Input
        label="Name"
        value={team.name}
        onChange={(e) => setTeam({ ...team, name: e })}
        required
        placeholder="Name your team..."
        invalid={validationError?.name?._errors?.length > 0}
        invalidText={validationError?.name?._errors?.[0]}
      />

      <Input
        label="Code"
        value={team.code}
        onChange={(e) => setTeam({ ...team, code: e })}
        placeholder="Optional — auto-generated if blank"
        invalid={validationError?.code?._errors?.length > 0}
        invalidText={validationError?.code?._errors?.[0]}
      />

      <Checkbox
        label="Public team"
        value={Boolean(team.public)}
        onChange={(e) => setTeam({ ...team, public: e })}
      />

      <label className="form-label">Team Size</label>
      <Checkbox
        label="Limit team size"
        value={limitSize}
        onChange={(e) => {
          setLimitSize(e);
          if (!e) setTeam({ ...team, maxSize: null });
          else if (!team.maxSize) setTeam({ ...team, maxSize: 1 });
        }}
      />
      {limitSize && (
        <Input
          value={team.maxSize}
          onChange={(e) => setTeam({ ...team, maxSize: parseInt(e, 10) })}
          type="number"
          min={1}
          appendedText="members"
          invalid={validationError?.maxSize?._errors?.length > 0}
          invalidText={validationError?.maxSize?._errors?.[0]}
        />
      )}

      <Button onClick={handleSubmit} loading={mutationLoading} variant="primary">
        {team.id ? "Update" : "Create"} Team
      </Button>
    </div>
  );
};
