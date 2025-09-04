import React from "react";
import { Button } from "tabler-react-2";
import { useOffcanvas } from "tabler-react-2/dist/offcanvas";

// Usage: <OffcanvasTrigger prompt={...}>...content...</OffcanvasTrigger>
export const OffcanvasTrigger = ({ prompt, children, ...props }) => {
  const { OffcanvasElement, offcanvas } = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });

  return (
    <>
      {OffcanvasElement}
      <Button onClick={() => offcanvas({ content: <>{children}</> })} {...props}>
        {prompt}
      </Button>
    </>
  );
};

export default OffcanvasTrigger;

