import { useState, useEffect, useRef } from "react";
import { Button } from "tabler-react-2";
import styles from "./dropdown.module.css";

export const Dropdown = ({
  prompt,
  open: _open = false,
  children,
  ghost = false,
  onOpenChange,
}) => {
  const [open, setOpen] = useState(_open);
  const ref = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
    onOpenChange && onOpenChange(!open);
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        onOpenChange && onOpenChange(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  // Sync internal state to prop changes
  useEffect(() => {
    setOpen(_open);
  }, [_open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {ghost ? (
        <span className="cursor-pointer m-0 p-1" onClick={handleClick}>
          {prompt}
        </span>
      ) : (
        <Button className="dropdown-toggle" onClick={handleClick}>
          {prompt}
        </Button>
      )}
      <div className={`dropdown-menu ${open ? "show" : ""}`}>
        <div className={styles.dropdownContent}>{children}</div>
      </div>
    </div>
  );
};
