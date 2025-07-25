import React, { useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { TriPanelLayout } from "../TriPanelLayout/TriPanelLayout";
import { Palette } from "./Palette.jsx";
import { FormPreview } from "./FormPreview.jsx";
import { FieldSettings } from "./FieldSettings";

export const FormBuilder = () => {
  const inputTypes = [
    {
      id: "text",
      label: "Text Input",
      description: "Single-line text input",
      icon: "cursor-text",
      iconColor: "var(--tblr-green)",
      defaults: { placeholder: "Yah name" },
      supports: ["label", "placeholder", "description", "required"],
    },
    {
      id: "email",
      label: "Email",
      description: "Email address input",
      icon: "mail",
      iconColor: "var(--tblr-purple)",
      supports: ["label", "placeholder", "description", "required"],
    },
    {
      id: "textarea",
      label: "Textarea",
      description: "Multi-line text input",
      icon: "cursor-text",
      iconColor: "var(--tblr-yellow)",
      supports: ["label", "description", "required", "rows"],
    },
    {
      id: "markdown",
      label: "Markdown",
      description: "Display rich text. Does not accept input.",
      icon: "markdown",
      iconColor: "var(--tblr-cyan)",
      supports: ["label", "markdown"],
    },
  ];

  const [pages, setPages] = useState([{ id: 0, name: "", fields: [] }]);
  const [selectedFieldLocation, setSelectedFieldLocation] = useState(null);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;

    setSelectedFieldLocation(null);

    // 1) PAGE reorder
    if (
      source.droppableId === "PAGE_LIST" &&
      destination.droppableId === "PAGE_LIST"
    ) {
      setPages((prev) => reorder(prev, source.index, destination.index));
      return;
    }

    // 2) palette → page
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
        ...typeDef.defaults,
        typeDef,
      };

      setPages((prev) => {
        const next = Array.from(prev);
        const destFields = Array.from(next[pageIndex].fields);
        destFields.splice(destination.index, 0, newField);
        next[pageIndex] = { ...next[pageIndex], fields: destFields };
        return next;
      });
      setSelectedFieldLocation({
        pageIndex: pageIndex,
        fieldIndex: destination.index,
      });

      return;
    }

    // 3) field ↔ field (within/between pages)
    if (
      source.droppableId.startsWith("PAGE-") &&
      destination.droppableId.startsWith("PAGE-")
    ) {
      const srcIdx = pages.findIndex(
        (p) => `PAGE-${p.id}` === source.droppableId
      );
      const dstIdx = pages.findIndex(
        (p) => `PAGE-${p.id}` === destination.droppableId
      );
      if (srcIdx < 0 || dstIdx < 0) return;

      setPages((prev) => {
        const next = Array.from(prev);
        const srcFields = Array.from(next[srcIdx].fields);
        const [moved] = srcFields.splice(source.index, 1);

        if (srcIdx === dstIdx) {
          srcFields.splice(destination.index, 0, moved);
          next[srcIdx] = { ...next[srcIdx], fields: srcFields };
        } else {
          const dstFields = Array.from(next[dstIdx].fields);
          dstFields.splice(destination.index, 0, moved);
          next[srcIdx] = { ...next[srcIdx], fields: srcFields };
          next[dstIdx] = { ...next[dstIdx], fields: dstFields };
        }

        return next;
      });
      return;
    }
  };

  const selectedField =
    selectedFieldLocation != null
      ? pages[selectedFieldLocation.pageIndex]?.fields[
          selectedFieldLocation.fieldIndex
        ]
      : null;

  const handleFieldChange = (key, value) => {
    if (!selectedFieldLocation) return;
    const { pageIndex, fieldIndex } = selectedFieldLocation;
    setPages((prev) => {
      const next = [...prev];
      const page = { ...next[pageIndex] };
      const fields = [...page.fields];
      const field = { ...fields[fieldIndex], [key]: value };
      fields[fieldIndex] = field;
      next[pageIndex] = { ...page, fields };
      return next;
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <TriPanelLayout
        leftIcon="palette"
        leftTitle="Palette"
        leftChildren={<Palette inputTypes={inputTypes} />}
        centerIcon="forms"
        centerTitle="Form Preview"
        centerChildren={
          <FormPreview
            pages={pages}
            setPages={setPages}
            setSelectedFieldLocation={setSelectedFieldLocation}
            selectedField={selectedField}
          />
        }
        centerContentClassName="bg-gray-100 polka"
        centerContentProps={{
          style: { padding: 9, margin: -9, height: "100%" },
        }}
        rightIcon="adjustments-alt"
        rightTitle="Field Settings"
        rightChildren={
          selectedField ? (
            <FieldSettings field={selectedField} onChange={handleFieldChange} />
          ) : (
            <div>Select a field to configure</div>
          )
        }
      />
    </DragDropContext>
  );
};
