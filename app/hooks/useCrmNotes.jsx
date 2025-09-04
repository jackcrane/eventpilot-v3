import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import toast from "react-hot-toast";
import { authFetch, authFetchWithoutContentType } from "../util/url";

const fetcher = (url) => authFetch(url).then((r) => r.json());

export const useCrmNotes = ({ eventId, personId }) => {
  const key = personId ? `/api/events/${eventId}/crm/person/${personId}/notes` : null;
  const { data, error, isLoading } = useSWR(key, fetcher);

  // Create text note
  const { trigger: createTextNote, isMutating: creating } = useSWRMutation(
    key,
    async (url, { arg }) => {
      const res = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({ text: arg?.text }),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    }
  );

  // Upload file as note
  const { trigger: uploadFileNote, isMutating: uploading } = useSWRMutation(
    key,
    async (url, { arg }) => {
      const form = new FormData();
      form.append("file", arg.file);
      const res = await authFetchWithoutContentType(`${url}/file`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("File upload failed");
      return res.json();
    }
  );

  const addNote = async (text) => {
    if (!text || !text.trim()) return false;
    try {
      const p = createTextNote({ text });
      await toast.promise(p, {
        loading: "Saving note...",
        success: "Note saved",
        error: "Failed to save note",
      });
      await mutate(key);
      return true;
    } catch {
      return false;
    }
  };

  const uploadNotesFiles = async (files = []) => {
    try {
      for (const file of files) {
        const p = uploadFileNote({ file });
        await toast.promise(p, {
          loading: `Uploading ${file.name}...`,
          success: `${file.name} uploaded`,
          error: `${file.name} failed to upload`,
        });
      }
      await mutate(key);
      return true;
    } catch {
      return false;
    }
  };

  return {
    notes: data?.notes ?? [],
    loading: isLoading,
    error,
    refetch: () => mutate(key),
    addNote,
    uploadNotesFiles,
    mutationLoading: creating || uploading,
  };
};

