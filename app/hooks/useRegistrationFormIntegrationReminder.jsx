import { useCallback } from "react";
import toast from "react-hot-toast";
import { useModal } from "tabler-react-2";
import { authFetch } from "../util/url";
import { useParticipantRegistrationForm } from "./useParticipantRegistrationForm";

const newId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

const normalizePages = (pages = []) =>
  pages.map((page, pageIndex) => ({
    ...page,
    order: pageIndex,
    fields: Array.isArray(page.fields)
      ? page.fields.map((field, fieldIndex) => ({
          ...field,
          order: fieldIndex,
        }))
      : [],
  }));

const hasFieldType = (pages = [], type) =>
  pages.some((page) =>
    (page.fields || []).some(
      (field) => field?.type?.toLowerCase() === type.toLowerCase()
    )
  );

export const useRegistrationFormIntegrationReminder = ({
  eventId,
  fieldType,
  modalTitle,
  modalText,
  pageTitle,
  buildField,
  todoTitle,
  todoContent,
}) => {
  const {
    pages,
    refetch,
    updatePages,
  } = useParticipantRegistrationForm({ eventId });

  const {
    modal,
    ModalElement,
  } = useModal({
    title: modalTitle,
    text: modalText,
    buttons: [
      { text: "Add for me", variant: "primary", value: "add" },
      {
        text: "Take me to the form builder",
        variant: "secondary",
        value: "builder",
      },
      { text: "Later", variant: "ghost", value: "later" },
    ],
  });

  const fetchPages = useCallback(async () => {
    if (!eventId) return [];
    if (Array.isArray(pages) && pages.length) return pages;
    const fresh = (await refetch?.()) || {};
    return fresh?.pages || pages || [];
  }, [eventId, pages, refetch]);

  const addPageWithField = useCallback(
    async (currentPages = []) => {
      const safePages = normalizePages(currentPages);
      const newField = {
        id: newId(),
        order: 0,
        ...buildField(),
      };
      const newPage = {
        id: newId(),
        name: pageTitle,
        order: safePages.length,
        fields: [newField],
      };
      const nextPages = [...safePages, newPage];
      const ok = await updatePages?.({ pages: nextPages });
      if (!ok) throw new Error("Failed to update form");
    },
    [buildField, pageTitle, updatePages]
  );

  const createTodo = useCallback(async () => {
    if (!eventId) return;
    const url = `/api/events/${eventId}/todos`;
    const payload = {
      title: todoTitle,
      content: todoContent,
    };
    await toast.promise(
      authFetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.message || "Failed to create todo");
        return j;
      }),
      {
        loading: "Creating reminder...",
        success: "Reminder added",
        error: (e) => e?.message || "Failed to create reminder",
      }
    );
  }, [eventId, todoContent, todoTitle]);

  const maybePrompt = useCallback(async () => {
    if (!eventId) return;
    const currentPages = await fetchPages();
    if (hasFieldType(currentPages, fieldType)) return;

    const action = await modal();
    if (action === "add") {
      await addPageWithField(currentPages);
    } else if (action === "builder") {
      window.location.assign(`/events/${eventId}/registration/forms`);
    } else if (action === "later") {
      await createTodo();
    }
  }, [
    addPageWithField,
    createTodo,
    eventId,
    fetchPages,
    fieldType,
    modal,
  ]);

  return {
    maybePrompt,
    ModalElement,
  };
};
