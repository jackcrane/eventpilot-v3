import useSWR from "swr";
import { authFetch } from "../util/url";

// Fetch subjects for a set of Gmail conversation thread IDs
// Returns a map { [id]: subject }
export const useConversationSubjects = ({ eventId, ids } = {}) => {
  const list = Array.isArray(ids) ? Array.from(new Set(ids.filter(Boolean))) : [];
  const key = eventId && list.length ? [`/api/events/${eventId}/conversations/v2/subjects`, ...list] : null;

  const { data, error, isLoading, mutate } = useSWR(key, async () => {
    const results = await Promise.all(
      list.map(async (id) => {
        try {
          const res = await authFetch(`/api/events/${eventId}/conversations/v2/threads/${id}`);
          if (!res.ok) return { id, subject: null };
          const j = await res.json();
          const subject = j?.thread?.subject || j?.lastMessage?.subject || j?.messages?.[0]?.subject || null;
          return { id, subject };
        } catch (_) {
          return { id, subject: null };
        }
      })
    );
    const map = {};
    for (const r of results) map[r.id] = r.subject;
    return map;
  });

  return {
    subjects: data || {},
    loading: isLoading,
    error,
    refetch: mutate,
  };
};

