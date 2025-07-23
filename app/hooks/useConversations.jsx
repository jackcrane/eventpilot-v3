import useSWR, { mutate } from "swr";
import useSWRSubscription from "swr/subscription";
import { authFetch, u } from "../util/url";
import { useState } from "react";
import toast from "react-hot-toast";
import { Typography, Button } from "tabler-react-2";
import { Col, Row } from "../util/Flex";
import { Icon } from "../util/Icon";
import { useNavigate } from "react-router-dom";

const fetcher = (url) => authFetch(url).then((res) => res.json());

window.toast = toast;

export const useConversations = ({ eventId }) => {
  const key = `/api/events/${eventId}/conversations`;
  const subKey = u(`/api/events/${eventId}/conversations/subscribe`);

  // fetch existing conversations
  const { data, error, isLoading } = useSWR(key, fetcher);
  const navigate = useNavigate();

  // subscribe to incoming emails via SSE
  useSWRSubscription(
    subKey,
    (path, { next }) => {
      const es = new EventSource(path);

      es.onmessage = (e) => {
        const email = JSON.parse(e.data);
        console.log("Received email", email);
        // tell SWR to revalidate/fetch the latest list
        mutate(key);
        // toast and native notification
        toast(
          <>
            <Row gap={1} align="center">
              <Icon i="mail" size={24} className="text-primary" />
              <Col align="flex-start">
                <Typography.H3>New email</Typography.H3>
                <Typography.Text style={{ textAlign: "left" }}>
                  <Typography.B>{email.subject}</Typography.B> from{" "}
                  {email.from.name}
                </Typography.Text>
                <Button
                  onClick={() =>
                    navigate(
                      `/events/${eventId}/conversations/${email.conversationId}`
                    )
                  }
                  variant="primary"
                >
                  View email
                </Button>
              </Col>
            </Row>
          </>,
          {
            style: {
              border: "1px solid var(--tblr-primary)",
            },
            duration: 15000,
            position: "bottom-right",
          }
        );

        if (Notification.permission === "granted") {
          new Notification("New email", { body: email.subject });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
        // pass along for any other subscribers
        next(null, email);
      };

      es.onerror = (err) => next(err);
      return () => es.close();
    },
    {}
  );

  const [mutationLoading, setMutationLoading] = useState(false);
  const createConversation = async (payload, onSuccess) => {
    setMutationLoading(true);
    try {
      const promise = authFetch(key, {
        method: "POST",
        body: JSON.stringify(payload),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      });
      const result = await toast.promise(promise, {
        loading: "Creating...",
        success: "Created successfully",
        error: "Error",
      });
      if (onSuccess && result.conversation.id)
        onSuccess(result.conversation.id);
      await mutate(key);
      return true;
    } catch {
      return false;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    conversations: data?.conversations,
    loading: isLoading,
    mutationLoading,
    error,
    refetch: () => mutate(key),
    createConversation,
  };
};
