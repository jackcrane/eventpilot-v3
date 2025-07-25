// FormBuilder.jsx
import React, { useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { TriPanelLayout } from "../TriPanelLayout/TriPanelLayout";
import { Palette } from "./Palette";
import { FormPreview } from "./FormPreview";
import styles from "./FormBuilder.module.css";

export const FormBuilder = () => {
  const inputTypes = [
    { id: "text", label: "Text Input" },
    { id: "email", label: "Email" },
    { id: "checkbox", label: "Checkbox" },
    { id: "textarea", label: "Textarea" },
  ];

  const [pages, setPages] = useState([{ id: 0, name: "Page 1", fields: [] }]);

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;

    // palette → page
    if (
      source.droppableId === "PALETTE" &&
      destination.droppableId.startsWith("PAGE-")
    ) {
      const pageIndex = pages.findIndex(
        (p) => `PAGE-${p.id}` === destination.droppableId
      );
      if (pageIndex < 0) return;
      const typeDef = inputTypes.find((t) => t.id === draggableId);
      if (!typeDef) return;

      const newField = {
        id: `${draggableId}-${Date.now()}`,
        type: typeDef.id,
        label: typeDef.label,
      };
      const newPages = [...pages];
      const destFields = Array.from(newPages[pageIndex].fields);
      destFields.splice(destination.index, 0, newField);
      newPages[pageIndex] = { ...newPages[pageIndex], fields: destFields };
      setPages(newPages);

      // page ↔ page
    } else if (
      source.droppableId.startsWith("PAGE-") &&
      destination.droppableId.startsWith("PAGE-")
    ) {
      const srcIndex = pages.findIndex(
        (p) => `PAGE-${p.id}` === source.droppableId
      );
      const dstIndex = pages.findIndex(
        (p) => `PAGE-${p.id}` === destination.droppableId
      );
      if (srcIndex < 0 || dstIndex < 0) return;

      const newPages = [...pages];
      const srcFields = Array.from(newPages[srcIndex].fields);
      const [moved] = srcFields.splice(source.index, 1);

      if (srcIndex === dstIndex) {
        srcFields.splice(destination.index, 0, moved);
        newPages[srcIndex] = { ...newPages[srcIndex], fields: srcFields };
      } else {
        const dstFields = Array.from(newPages[dstIndex].fields);
        dstFields.splice(destination.index, 0, moved);
        newPages[srcIndex] = { ...newPages[srcIndex], fields: srcFields };
        newPages[dstIndex] = { ...newPages[dstIndex], fields: dstFields };
      }

      setPages(newPages);
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <TriPanelLayout
        leftIcon="palette"
        leftTitle="Palette"
        leftChildren={<Palette inputTypes={inputTypes} />}
        centerIcon="forms"
        centerTitle="Form Preview"
        centerChildren={<FormPreview pages={pages} setPages={setPages} />}
        centerContentClassName="bg-gray-100 polka"
        centerContentProps={{
          style: { padding: 9, margin: -9, height: "100%" },
        }}
        rightIcon="adjustments-alt"
        rightTitle="Field Settings"
        rightChildren={<div>Step 3</div>}
      />
    </DragDropContext>
  );
};
