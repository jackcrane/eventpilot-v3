import { useCallback } from "react";
import { useModal } from "tabler-react-2";
import { useNavigate } from "react-router-dom";
import { useParticipantRegistrationForm } from "./useParticipantRegistrationForm";
import { useTodos } from "./useTodos";
import toast from "react-hot-toast";

const uniqueId = () => `${Date.now()}${Math.round(Math.random() * 1_000_000)}`;

const normalizeField = (field, index) => {
  if (!field || typeof field !== "object") return field;
  return {
    ...field,
    order: typeof field.order === "number" ? field.order : index,
    type:
      typeof field.type === "string" ? field.type.toLowerCase() : field.type,
    options: Array.isArray(field.options)
      ? field.options.map((opt) => ({ ...opt }))
      : field.options,
  };
};

const normalizePage = (page, pageIndex) => {
  if (!page || typeof page !== "object") return page;
  const fields = Array.isArray(page.fields)
    ? page.fields.map((field, fieldIndex) => normalizeField(field, fieldIndex))
    : [];

  return {
    ...page,
    order: typeof page.order === "number" ? page.order : pageIndex,
    fields,
  };
};

const ensureOrders = (pages) =>
  pages.map((page, pageIndex) => {
    const normalizedPage = normalizePage(page, pageIndex);
    const orderedFields = normalizedPage.fields.map((field, fieldIndex) => ({
      ...field,
      order: fieldIndex,
    }));

    return {
      ...normalizedPage,
      order: pageIndex,
      fields: orderedFields,
    };
  });

export const useRegistrationFormRequirementPrompt = ({
  eventId,
  fieldType,
  modalTitle,
  modalText,
  todoTitle,
  todoContent = "",
  newPageName,
  buildField,
  formPath = `/events/${eventId}/registration/form-builder`,
}) => {
  const navigate = useNavigate();
  const {
    pages,
    refetch: refetchForm,
    updatePages,
  } = useParticipantRegistrationForm({ eventId });
  const { createTodo } = useTodos({ eventId });

  const { modal, ModalElement } = useModal({
    title: modalTitle,
    text: modalText,
    buttons: [
      {
        text: "Add for me",
        variant: "primary",
        value: "add",
      },
      {
        text: "Take me to the form builder",
        variant: "outline",
        value: "goto",
      },
      {
        text: "Later",
        variant: "ghost",
        value: "later",
      },
    ],
  });

  const hasField = useCallback(
    (sourcePages) =>
      Array.isArray(sourcePages) &&
      sourcePages.some(
        (page) =>
          Array.isArray(page.fields) &&
          page.fields.some((field) => field?.type === fieldType)
      ),
    [fieldType]
  );

  const ensureRequirement = useCallback(
    async ({ onBeforeNavigate } = {}) => {
      if (!eventId) return null;

      let currentPages = pages;
      if (!Array.isArray(currentPages)) {
        const refreshed = await refetchForm?.();
        currentPages = refreshed?.pages ?? [];
      }

      if (hasField(currentPages)) return null;

      const action = await modal();
      if (!action) return null;

      if (action === "add") {
        const safePages = Array.isArray(currentPages)
          ? currentPages.map((page, pageIndex) =>
              normalizePage(page, pageIndex)
            )
          : [];
        const nextPages = ensureOrders([
          ...safePages,
          {
            id: uniqueId(),
            name: newPageName,
            order: safePages.length,
            fields: [
              {
                id: uniqueId(),
                order: 0,
                ...buildField(),
                type: fieldType,
                fieldType,
              },
            ],
          },
        ]);

        await updatePages({ pages: nextPages });
        return action;
      }

      if (action === "goto") {
        if (typeof onBeforeNavigate === "function") onBeforeNavigate();
        navigate(formPath);
        return action;
      }

      if (action === "later") {
        await createTodo({ title: todoTitle, content: todoContent });
        toast("We created a todo item to remind you to add this field.");
        return action;
      }

      return action;
    },
    [
      buildField,
      createTodo,
      eventId,
      fieldType,
      formPath,
      hasField,
      modal,
      navigate,
      newPageName,
      pages,
      refetchForm,
      updatePages,
      todoTitle,
      todoContent,
    ]
  );

  return {
    ensureRequirement,
    RequirementModalElement: ModalElement,
  };
};
