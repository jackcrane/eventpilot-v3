import { Button } from "tabler-react-2";
import { useRegistrationUpsell } from "../../hooks/useRegistrationUpsell";

export const UpsellDeleteTrigger = ({
  children,
  upsellItemId,
  onDelete,
  eventId,
  ...props
}) => {
  const { DeleteConfirmElement: ConfirmModal, deleteUpsell: deleteUpsell } =
    useRegistrationUpsell({ eventId, upsellItemId });

  return (
    <>
      {ConfirmModal}
      <Button
        onClick={() => deleteUpsell(onDelete)}
        variant="danger"
        outline
        {...props}
      >
        {children}
      </Button>
    </>
  );
};
