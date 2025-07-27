import React, { useEffect, useState } from "react";
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
import toast from "react-hot-toast";

export const FormBuilder = ({
  onSave: passedOnSave,
  initialValues = [],
  loading,
  customFieldTypes = [],
  requiredFieldTypes = [],
}) => {
  // helper to reorder arrays
  const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
  };

  // assign `order` to pages and their fields based on array index
  const updatePageAndFieldOrders = (pagesArr) =>
    pagesArr.map((page, pIndex) => ({
      ...page,
      order: pIndex,
      fields: page.fields.map((field, fIndex) => ({
        ...field,
        pageIndex: pIndex,
        order: fIndex,
      })),
    }));

  // initialize pages with order & field.order
  const [pages, setPages] = useState(
    updatePageAndFieldOrders(
      Array.isArray(initialValues) && initialValues.length
        ? initialValues.map((page, pIndex) => ({
            ...page,
            fields: Array.isArray(page.fields)
              ? page.fields.map((f, fIndex) => ({
                  ...f,
                  type: f.type.toLowerCase(),
                  pageIndex: pIndex,
                  order: fIndex,
                }))
              : [],
          }))
        : [{ id: Date.now().toString(), name: "", fields: [] }]
    )
  );
  const [selectedFieldLocation, setSelectedFieldLocation] = useState(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(null);

  useEffect(() => {
    if (!Array.isArray(initialValues)) return;
    setPages(
      updatePageAndFieldOrders(
        initialValues.map((page, pIndex) => ({
          ...page,
          fields: Array.isArray(page.fields)
            ? page.fields.map((f, fIndex) => ({
                ...f,
                type: f.type.toLowerCase(),
                pageIndex: pIndex,
                order: fIndex,
              }))
            : [],
        }))
      )
    );
  }, [initialValues]);

  // Merge any custom types that specify a baseType:
  const mergedCustomFieldTypes = customFieldTypes.map((ct) => {
    if (ct.baseType) {
      const base = inputTypes.find((t) => t.id === ct.baseType);
      return {
        ...base,
        ...ct,
        supports: ct.supports ?? base.supports,
        defaults: ct.defaults ?? base.defaults,
      };
    }
    return ct;
  });

  const mergedRequiredTypes = requiredFieldTypes.map((rt) => {
    if (!rt.baseType) return rt;
    const base = inputTypes.find((t) => t.id === rt.baseType);
    return {
      ...base,
      ...rt,
      supports: rt.supports ?? base.supports,
      fromRequiredFieldType: true,
      defaults: {
        ...base.defaults,
        label: rt.label,
        required: true,
        placeholder: rt.placeholder ?? "",
        description: rt.description ?? "",
        prompt: base.defaults?.prompt ?? null,
        rows: base.defaults?.rows ?? null,
        markdown: null,
        options: base.defaults?.options ?? [],
        ...rt.defaults,
      },
    };
  });

  const allInputTypes = [
    ...inputTypes,
    ...mergedCustomFieldTypes,
    ...mergedRequiredTypes,
  ];

  const missingRequired = requiredFieldTypes.filter(
    (req) => !pages.some((p) => p.fields.some((f) => f.fieldType === req.id))
  );

  const paletteRequiredTypes = missingRequired;
  const paletteOptionalTypes = allInputTypes.filter(
    (t) => !requiredFieldTypes.some((req) => req.id === t.id)
  );

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    setSelectedFieldLocation(null);
    setSelectedPageIndex(null);

    // 1) PAGE reorder
    if (
      source.droppableId === "PAGE_LIST" &&
      destination.droppableId === "PAGE_LIST"
    ) {
      setPages((prev) =>
        updatePageAndFieldOrders(reorder(prev, source.index, destination.index))
      );
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
      const typeDef = allInputTypes.find((t) => t.id === draggableId);
      if (!typeDef) return;

      const newField = {
        id: Date.now().toString(),
        type: typeDef.baseType ?? typeDef.id,
        fieldType: typeDef.fromRequiredFieldType ? typeDef.id : null,
        ...typeDef.defaults,
      };

      setPages((prev) => {
        const next = [...prev];
        const destFields = [...next[pageIndex].fields];
        destFields.splice(destination.index, 0, newField);
        next[pageIndex] = { ...next[pageIndex], fields: destFields };
        return updatePageAndFieldOrders(next);
      });
      setSelectedFieldLocation({
        pageIndex,
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
        const srcFields = Array.from(next[srcIdx].fields);
        const [moved] = srcFields.splice(source.index, 1);
        next[srcIdx] = { ...next[srcIdx], fields: srcFields };

        // insert into destination
        const dstFields = Array.from(next[dstIdx].fields);
        dstFields.splice(destination.index, 0, moved);
        next[dstIdx] = { ...next[dstIdx], fields: dstFields };

        return updatePageAndFieldOrders(next);
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
      fields[fieldIndex] = { ...fields[fieldIndex], [key]: value };
      next[pageIndex] = { ...page, fields };
      return updatePageAndFieldOrders(next);
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
      return updatePageAndFieldOrders(next);
    });
  };

  const onSave = () => {
    if (missingRequired.length) {
      toast.error(
        `Missing required fields: ${missingRequired
          .map((f) => f.label)
          .join(", ")}`
      );
      return;
    }
    passedOnSave?.({ pages });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Button onClick={onSave} className="mb-3" loading={loading}>
        Save
      </Button>
      <TriPanelLayout
        leftIcon="palette"
        leftTitle="Palette"
        leftChildren={
          <Palette
            requiredTypes={paletteRequiredTypes}
            inputTypes={paletteOptionalTypes}
          />
        }
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
            inputTypes={allInputTypes}
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
                    Click on the edit (<Icon i="pencil" size={16} />) button to
                    configure a field or page.
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
