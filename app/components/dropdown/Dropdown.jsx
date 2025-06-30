import { useState } from "react";
import { Button } from "tabler-react-2";
import styles from "./dropdown.module.css";

export const Dropdown = ({ prompt, open: _open = false, children }) => {
  const [open, setOpen] = useState(_open);

  return (
    <div style={{ position: "relative" }}>
      <Button className="dropdown-toggle" onClick={() => setOpen(!open)}>
        {prompt}
      </Button>
      <div className={`dropdown-menu ${open ? "show" : ""}`}>
        <div className={styles.dropdownContent}>{children}</div>
      </div>
    </div>
  );
};
