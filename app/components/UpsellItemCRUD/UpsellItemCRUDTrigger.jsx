import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { UpsellItemCRUD } from "./UpsellItemCRUD";
import { Button } from "tabler-react-2";

export const UpsellItemCRUDTrigger = ({ children }) => {
  const { OffcanvasElement, close, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <div>
      {OffcanvasElement}
      <Button
        onClick={() =>
          offcanvas({ content: <UpsellItemCRUD onClose={close} /> })
        }
      >
        {children}
      </Button>
    </div>
  );
};
