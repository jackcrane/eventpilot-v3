import { Button } from "tabler-react-2";
import { useRegistrationTeam } from "../../hooks/useRegistrationTeam";

export const TeamDeleteTrigger = ({ children, teamId, onDelete, eventId, ...props }) => {
  const { DeleteConfirmElement: ConfirmModal, deleteTeam } = useRegistrationTeam({
    eventId,
    teamId,
  });

  return (
    <>
      {ConfirmModal}
      <Button onClick={() => deleteTeam(onDelete)} variant="danger" outline {...props}>
        {children}
      </Button>
    </>
  );
};

