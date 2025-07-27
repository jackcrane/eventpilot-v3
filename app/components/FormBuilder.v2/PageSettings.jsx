import React from "react";
import { Input } from "tabler-react-2";

export const PageSettings = ({ page, onChange }) => {
  return (
    <div>
      <Input
        label="Page Name"
        value={page.name}
        placeholder="Untitled Page"
        onInput={(e) => onChange("name", e)}
      />
    </div>
  );
};
