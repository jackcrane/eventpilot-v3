import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { UpsellItemCRUD } from "./UpsellItemCRUD";
import { Button } from "tabler-react-2";

export const UpsellItemCRUDTrigger = ({ children, upsellItem, ...props }) => {
  const { OffcanvasElement, close, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Button
        onClick={() =>
          offcanvas({
            content: <UpsellItemCRUD onClose={close} upsellItem={upsellItem} />,
          })
        }
        {...props}
      >
        {children}
      </Button>
    </>
  );
};
