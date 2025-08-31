import { useOffcanvas } from "tabler-react-2/dist/offcanvas";
import { TeamCRUD } from "./TeamCRUD";
import { Button } from "tabler-react-2";

export const TeamCRUDTrigger = ({ children, team, ...props }) => {
  const { OffcanvasElement, close, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Button
        onClick={() =>
          offcanvas({ content: <TeamCRUD onClose={close} team={team} /> })
        }
        {...props}
      >
        {children}
      </Button>
    </>
  );
};

