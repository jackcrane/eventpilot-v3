import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Typography, Card } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";
import { useConversationThreads } from "../../../../../hooks/useConversationThreads";
import { useConversationThread } from "../../../../../hooks/useConversationThread";
import { useConversationEvents } from "../../../../../hooks/useConversationEvents";
import { Loading } from "../../../../../components/loading/Loading";
import { useCrmLedger } from "../../../../../hooks/useCrmLedger";
import { NotesCrm } from "../../../../../components/NotesCrm/NotesCrm";
import { ThreadListing } from "./ThreadListing";
import { Conversation } from "./components/Conversation";

export const EventConversationsPage = () => {
  const { eventId, threadId: threadIdParam } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Prefer path param, but fall back to query param for backward compatibility
  const selectedThreadId = threadIdParam || searchParams.get("threadId") || null;
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  useEffect(() => {
    // Keep local state in sync if URL changes externally
    const urlQ = searchParams.get("q") || "";
    if (urlQ !== query) setQuery(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
    refetch: refetchThreads,
    loadOlder,
    mutationLoading: loadingOlder,
  } = useConversationThreads({
    eventId,
    q: query || undefined,
    maxResults: 20,
  });

  const {
    thread,
    messages,
    responseRecipient,
    participants,
    loading: threadLoading,
    refetch: refetchThread,
  } = useConversationThread({ eventId, threadId: selectedThreadId });

  // Subscribe to inbound/outbound email events for this event; refresh lists/details + toast
  useConversationEvents({
    eventId,
    onEmail: async () => {
      try {
        await Promise.all([refetchThread?.(), refetchThreads?.()]);
      } catch (_) {}
    },
  });
  const [composeMode, setComposeMode] = useState(false);

  // listing search handled in ThreadListing; query state stays here

  const handleSelectThread = (id) => {
    // Preserve existing search params (like q), but move threadId into the path
    const next = new URLSearchParams(searchParams);
    next.delete("threadId");
    const qs = next.toString();
    const url = `/events/${eventId}/conversations/${id}${qs ? `?${qs}` : ""}`;
    navigate(url);
  };

  // Write q to the URL when it changes (debounced by simple timeout)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (query) next.set("q", query);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleCompose = () => {
    setComposeMode(true);
    const next = new URLSearchParams(searchParams);
    next.delete("threadId");
    const qs = next.toString();
    const url = `/events/${eventId}/conversations${qs ? `?${qs}` : ""}`;
    navigate(url);
  };


  // Person tab content (used in Card tabs)
  const PersonTabContent = ({ person }) => {
    const { lifetimeValue, loading: ltvLoading } = useCrmLedger({
      eventId,
      personId: person?.id,
    });
    const fmt = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });

    return (
      <div>
        <Row justify="flex-end">
          <a
            href={`/events/${eventId}/crm/${person?.id}`}
            className="btn btn-sm"
            style={{ textDecoration: "none" }}
          >
            View full record
          </a>
        </Row>
        <Col gap={0.25} align="flex-start">
          <Typography.H5 className="mb-1">Emails</Typography.H5>
          {Array.isArray(person?.emails) && person.emails.length ? (
            person.emails.map((e) => (
              <Typography.Text key={e.id} className="mb-0" style={{ wordBreak: "break-all" }}>
                {e.email}
                {e.label ? ` • ${e.label}` : ""}
              </Typography.Text>
            ))
          ) : (
            <Typography.Text className="mb-0">—</Typography.Text>
          )}
          <Typography.H5 className="mt-3 mb-1">Phones</Typography.H5>
          {Array.isArray(person?.phones) && person.phones.length ? (
            person.phones.map((ph) => (
              <Typography.Text key={ph.id} className="mb-0">
                {ph.phone}
                {ph.label ? ` • ${ph.label}` : ""}
              </Typography.Text>
            ))
          ) : (
            <Typography.Text className="mb-0">—</Typography.Text>
          )}
        </Col>
        <Typography.H5 className="mt-3 mb-1">Lifetime Value</Typography.H5>
        <Typography.Text className="mb-0">
          {ltvLoading ? "Loading…" : fmt.format(Number(lifetimeValue || 0))}
        </Typography.Text>
        <Typography.H5 className="mt-3 mb-1">Notes</Typography.H5>
        <NotesCrm eventId={eventId} personId={person?.id} hideTitle />
      </div>
    );
  };

  const rightDetails = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {!selectedThreadId ? (
        <Typography.Text className="text-muted">
          Select a conversation to see details.
        </Typography.Text>
      ) : threadLoading ? (
        <Loading gradient={false} />
      ) : Array.isArray(participants) && participants.length ? (
        <Card
          size="md"
          variantPos="top"
          tabs={participants.map((p) => ({
            title: p.name || "Unnamed",
            content: <PersonTabContent person={p} />,
          }))}
        />
      ) : (
        <Typography.Text className="text-muted">
          No linked CRM people for this conversation yet.
        </Typography.Text>
      )}
    </div>
  );

  return (
    <EventPage
      title="Conversations"
      description="Read and manage your event inbox."
    >
      <TriPanelLayout
        leftIcon="inbox"
        leftTitle="Inbox"
        leftChildren={
          <ThreadListing
            eventId={eventId}
            threads={threads}
            threadsLoading={threadsLoading}
            threadsError={threadsError}
            selectedThreadId={selectedThreadId}
            query={query}
            onQueryChange={setQuery}
            onSelectThread={(id) => {
              setComposeMode(false);
              handleSelectThread(id);
            }}
            onCompose={handleCompose}
            loadOlder={loadOlder}
            loadingOlder={loadingOlder}
          />
        }
        leftWidth={300}
        centerIcon="messages"
        centerTitle={thread?.subject || "Conversation"}
        centerChildren={
          <Conversation
            eventId={eventId}
            selectedThreadId={selectedThreadId}
            thread={thread}
            messages={messages}
            responseRecipient={responseRecipient}
            threadLoading={threadLoading}
            refetchThread={refetchThread}
            refetchThreads={refetchThreads}
            composeMode={composeMode}
            setComposeMode={setComposeMode}
          />
        }
        rightIcon="info-circle"
        rightTitle="Details"
        rightChildren={rightDetails}
      />
    </EventPage>
  );
};
