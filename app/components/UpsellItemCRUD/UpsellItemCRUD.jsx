import { Typography, Input, Checkbox, Button } from "tabler-react-2";
// import { ImageInput } from "../ImageInput/ImageInput";
import { useEffect, useState } from "react";
import { useRegistrationUpsells } from "../../hooks/useRegistrationUpsells";
import { useParams } from "react-router-dom";
import { useRegistrationUpsell } from "../../hooks/useRegistrationUpsell";
import { useRegistrationFormRequirementPrompt } from "../../hooks/useRegistrationFormRequirementPrompt";
import { Loading } from "../loading/Loading";

export const UpsellItemCRUD = ({
  upsellItem,
  onClose,
  registerRequirementModal,
  ...props
}) => {
  if (upsellItem?.id) {
    return (
      <UpsellEdit upsellItemId={upsellItem.id} onClose={onClose} {...props} />
    );
  }
  return (
    <UpsellCreate
      onClose={onClose}
      registerRequirementModal={registerRequirementModal}
      {...props}
    />
  );
};

const UpsellCreate = ({ onClose, registerRequirementModal }) => {
  const { eventId } = useParams();
  const { mutationLoading, createUpsell, validationError } =
    useRegistrationUpsells({ eventId });
  const {
    ensureRequirement: ensureUpsellSection,
    RequirementModalElement: UpsellSectionRequirementModal,
  } = useRegistrationFormRequirementPrompt({
    eventId,
    fieldType: "upsells",
    modalTitle: "Add upsells to the form",
    modalText:
      "Your upsell has been created. In order for participants to purchase it, you must add an upsells section to your registration form.",
    todoTitle: "Add upsells section to registration form",
    todoContent:
      "Place the upsells section on the participant registration form so new upsells can be offered during sign up.",
    newPageName: "Upsell Selection",
    buildField: () => ({}),
  });

  useEffect(() => {
    if (!registerRequirementModal) return undefined;
    registerRequirementModal((prev) =>
      prev === UpsellSectionRequirementModal ? prev : UpsellSectionRequirementModal
    );
    return () => registerRequirementModal(null);
  }, [registerRequirementModal, UpsellSectionRequirementModal]);

  return (
    <>
      {!registerRequirementModal && UpsellSectionRequirementModal}
      <_UpsellItemCRUD
        upsellItem={null}
        onClose={onClose}
        mutationLoading={mutationLoading}
        validationError={validationError}
        onFinish={createUpsell}
        onSuccess={async () => {
          const action = await ensureUpsellSection({
            onBeforeNavigate: () => onClose?.(),
          });
          if (action === "goto") return false;
          return true;
        }}
      />
    </>
  );
};

const UpsellEdit = ({ upsellItemId, onClose }) => {
  const { eventId } = useParams();
  const { upsell, loading, mutationLoading, validationError, updateUpsell } =
    useRegistrationUpsell({ eventId, upsellItemId });

  if (loading) return <Loading />;

  return (
    <_UpsellItemCRUD
      upsellItem={upsell}
      onClose={onClose}
      mutationLoading={mutationLoading}
      validationError={validationError}
      onFinish={updateUpsell}
    />
  );
};

const _UpsellItemCRUD = ({
  upsellItem,
  onClose,
  mutationLoading,
  validationError,
  onFinish,
  onSuccess,
}) => {
  // Default new upsell items to unlimited inventory (-1)
  const [item, setItem] = useState(upsellItem || { inventory: -1 });
  useEffect(() => {
    setItem(upsellItem || { inventory: -1 });
  }, [upsellItem]);

  const handleSubmit = async () => {
    if (
      await onFinish({
        name: item.name,
        description: item.description || "",
        price: parseFloat(item.price),
        inventory: parseInt(item.inventory, 10),
      })
    ) {
      const shouldClose = (await onSuccess?.()) ?? true;
      if (shouldClose) onClose?.();
    }
  };

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">UPSELL ITEM</Typography.H5>
      <Typography.H1>{upsellItem?.name || "New Upsell Item"}</Typography.H1>
      {/* <ImageInput /> */}
      <Input
        label="Name"
        value={item.name}
        onChange={(e) => setItem({ ...item, name: e })}
        required
        placeholder="Name your upsell item..."
        invalid={validationError?.name?._errors?.length > 0}
        invalidText={validationError?.name?._errors?.[0]}
      />
      <Input
        label="Description"
        value={item.description}
        onChange={(e) => setItem({ ...item, description: e })}
        invalid={validationError?.description?._errors?.length > 0}
        invalidText={validationError?.description?._errors?.[0]}
      />
      <Input
        label="Price"
        value={item.price}
        onChange={(e) => setItem({ ...item, price: parseInt(e, 10) })}
        prependedText="$"
        appendedText="USD"
        required
        type="number"
        min={0}
        invalid={validationError?.price?._errors?.length > 0}
        invalidText={validationError?.price?._errors?.[0]}
      />
      <label className="form-label">Inventory</label>
      <Checkbox
        label="Unlimited"
        value={item.inventory === -1}
        onChange={(e) => setItem({ ...item, inventory: e ? -1 : 0 })}
      />
      {item.inventory !== -1 && (
        <Input
          value={item.inventory}
          onChange={(e) => setItem({ ...item, inventory: parseInt(e, 10) })}
          type="number"
          min={0}
          appendedText="units"
          invalid={validationError?.inventory?._errors?.length > 0}
          invalidText={validationError?.inventory?._errors?.[0]}
        />
      )}
      <Button
        onClick={handleSubmit}
        loading={mutationLoading}
        variant="primary"
      >
        {item.id ? "Update" : "Create"} Upsell
      </Button>
    </div>
  );
};
