import React, { useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { TriPanelLayout } from "../TriPanelLayout/TriPanelLayout";
import { Palette } from "./Palette.jsx";
import { FormPreview } from "./FormPreview.jsx";
import { FieldSettings } from "./FieldSettings";
import { PageSettings } from "./PageSettings";
import { inputTypes } from "./InputTypes";
import { Empty } from "../empty/Empty";
import { Icon } from "../../util/Icon";
import { Button } from "tabler-react-2";

export const FormBuilder = () => {
  const [pages, setPages] = useState([{ id: 0, name: "", fields: [] }]);
  const [selectedFieldLocation, setSelectedFieldLocation] = useState(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(null);

  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;

    setSelectedFieldLocation(null);
    setSelectedPageIndex(null);

    // 1) PAGE reorder
    if (
      source.droppableId === "PAGE_LIST" &&
      destination.droppableId === "PAGE_LIST"
    ) {
      setPages((prev) => {
        const reordered = reorder(prev, source.index, destination.index);
        return reordered.map((page, pageIndex) => ({
          ...page,
          // update every field’s pageIndex to its new pageIndex
          fields: page.fields.map((field) => ({
            ...field,
            pageIndex,
          })),
        }));
      });

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
        id: `${Date.now()}`,
        type: typeDef.id,
        ...typeDef.defaults,
        typeDef,
        pageIndex,
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
        const next = [...prev];

        // remove from source
        const srcFields = [...next[srcIdx].fields];
        const [moved] = srcFields.splice(source.index, 1);

        // update its pageIndex
        const updatedField = { ...moved, pageIndex: dstIdx };

        // write back source
        next[srcIdx] = { ...next[srcIdx], fields: srcFields };

        // insert into dest
        const dstFields = [...next[dstIdx].fields];
        dstFields.splice(destination.index, 0, updatedField);
        next[dstIdx] = { ...next[dstIdx], fields: dstFields };

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

  const selectedPage =
    selectedPageIndex != null ? pages[selectedPageIndex] : null;

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

  const handlePageChange = (key, value) => {
    if (selectedPageIndex == null) return;
    setPages((prev) => {
      const next = [...prev];
      next[selectedPageIndex] = {
        ...next[selectedPageIndex],
        [key]: value,
      };
      return next;
    });
  };

  const onSave = () => {
    console.log("Saving form", pages);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Button onClick={onSave}>Save</Button>
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
            setSelectedFieldLocation={(v) => {
              setSelectedFieldLocation(v);
              setSelectedPageIndex(null);
            }}
            setSelectedPageIndex={(v) => {
              setSelectedPageIndex(v);
              setSelectedFieldLocation(null);
            }}
            selectedPageIndex={selectedPageIndex}
            selectedField={selectedField}
            selectedPage={selectedPage}
          />
        }
        centerContentClassName="bg-gray-100 polka"
        centerContentProps={{
          style: { padding: 9, margin: -9, height: "100%" },
        }}
        rightIcon="adjustments-alt"
        rightTitle="Field Settings"
        rightChildren={
          <>
            {selectedPage ? (
              <PageSettings page={selectedPage} onChange={handlePageChange} />
            ) : selectedField ? (
              <FieldSettings
                field={selectedField}
                onChange={handleFieldChange}
                pageName={pages[selectedField.pageIndex]?.name}
                onEditPage={() => {
                  setSelectedPageIndex(selectedField.pageIndex);
                  setSelectedFieldLocation(null);
                }}
              />
            ) : (
              <Empty
                title="Select a field or page to configure"
                text={
                  <span>
                    Click on the edit (
                    <Icon i="pencil" size={16} />) button to configure a field
                    or page.
                  </span>
                }
                gradient={false}
              />
            )}
          </>
        }
      />
    </DragDropContext>
  );
};
