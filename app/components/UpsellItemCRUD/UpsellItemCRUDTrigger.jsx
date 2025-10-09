import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { UpsellItemCRUD } from "./UpsellItemCRUD";
import { Button } from "tabler-react-2";
import { useState } from "react";

export const UpsellItemCRUDTrigger = ({ children, upsellItem, ...props }) => {
  const { OffcanvasElement, close, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const [requirementModal, setRequirementModal] = useState(null);

  return (
    <>
      {OffcanvasElement}
      {requirementModal}
      <Button
        onClick={() =>
          offcanvas({
            content: (
              <UpsellItemCRUD
                onClose={close}
                upsellItem={upsellItem}
                registerRequirementModal={setRequirementModal}
              />
            ),
          })
        }
        {...props}
      >
        {children}
      </Button>
    </>
  );
};
