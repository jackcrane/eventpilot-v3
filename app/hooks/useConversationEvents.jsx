import { useEffect, useRef } from "react";
import useSWRSubscription from "swr/subscription";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { u } from "../util/url";
import { Row } from "../util/Flex";
import { Icon } from "../util/Icon";
import { Button } from "tabler-react-2";
import { useNavigate } from "react-router-dom";

// Subscribe to conversation email events via SSE and fan-out UI updates
// Args: { eventId, onEmail }
// - Triggers revalidation for conversation list/detail keys on each event
// - Optionally invokes onEmail(payload)
export const useConversationEvents = ({ eventId, onEmail } = {}) => {
  const { mutate } = useSWRConfig();
  const lastIdRef = useRef(null);

  const key = eventId ? `/api/events/${eventId}/conversations/v2/stream` : null;

  const navigate = useNavigate();

  const { data, error } = useSWRSubscription(key, (key, { next }) => {
    if (!eventId) return () => {};
    const token = localStorage.getItem("token");
    if (!token) return () => {};

    const url = `${key}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(u(url));

    const handleEmail = (evt) => {
      try {
        const payload = JSON.parse(evt.data || "null");
        // Deduplicate if the same id arrives repeatedly
        if (payload?.id && lastIdRef.current === payload.id) return;
        if (payload?.id) lastIdRef.current = payload.id;

        // Revalidate any conversation list/detail keys for this event
        mutate((k) =>
          typeof k === "string" &&
          k.startsWith(`/api/events/${eventId}/conversations/v2/threads`)
        );

        // Show toast only for inbound emails. Inbound payloads include `receivedAt`.
        const isInbound = Boolean(payload && payload.receivedAt);
        if (isInbound) {
          const subj = payload?.subject || payload?.headers?.subject || "New email";
          const threadId =
            payload?.conversationId ||
            payload?.conversation?.id ||
            payload?.threadId ||
            null;
          toast(
            typeof subj === "string" ? (
              <Row gap={1} align="center">
                <Icon i="mail" size={24} />
                <span>
                  <b>New email received: </b>
                  <span>{subj}</span>
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    threadId
                      ? navigate(`/events/${eventId}/conversations/${threadId}`)
                      : null
                  }
                >
                  View
                </Button>
              </Row>
            ) : (
              "New email received"
            ),
            {
              position: "bottom-right",
              duration: 6000,
            }
          );
        }

        onEmail?.(payload);

        next(null, payload);
      } catch (e) {
        console.error(e);
      }
    };

    es.addEventListener("email", handleEmail);
    es.onerror = () => {
      // Close and let SWR decide about resubscribe
      try {
        es.close();
      } catch (e) {
        console.error(e);
      }
    };

    return () => {
      try {
        es.close();
      } catch (e) {
        console.error(e);
      }
    };
  });

  useEffect(() => {
    // reset last seen when event scope changes
    lastIdRef.current = null;
  }, [eventId]);

  return { lastEvent: data || null, error };
};
