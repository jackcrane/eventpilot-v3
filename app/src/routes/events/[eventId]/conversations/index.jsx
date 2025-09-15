import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { Typography, Card, Button, Input, Spinner } from "tabler-react-2";
import { Row, Col } from "../../../../../util/Flex";
import { EventPage } from "../../../../../components/eventPage/EventPage";
import { TriPanelLayout } from "../../../../../components/TriPanelLayout/TriPanelLayout";
import { useConversationThreads } from "../../../../../hooks/useConversationThreads";
import { useConversationThread } from "../../../../../hooks/useConversationThread";
import { useConversationReply } from "../../../../../hooks/useConversationReply";
import { useConversationCompose } from "../../../../../hooks/useConversationCompose";
import { useConversationThreadUnread } from "../../../../../hooks/useConversationThreadUnread";
import { useConversationEvents } from "../../../../../hooks/useConversationEvents";
import { useFileUploader } from "../../../../../hooks/useFileUploader";
import { Icon } from "../../../../../util/Icon";
import { Loading } from "../../../../../components/loading/Loading";
import { Empty } from "../../../../../components/empty/Empty";
import toast from "react-hot-toast";
import { SafeHtml } from "../../../../../components/SafeHtml/SafeHtml";
import { useCrmLedger } from "../../../../../hooks/useCrmLedger";
import { NotesCrm } from "../../../../../components/NotesCrm/NotesCrm";
import { ThreadListing } from "./ThreadListing";

// Format bytes into human-friendly units (b, kb, mb, gb)
const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs < 1024) return `${n} b`;
  const kb = n / 1024;
  if (abs < 1024 * 1024)
    return `${kb >= 10 ? Math.round(kb) : kb.toFixed(1)} kb`;
  const mb = n / (1024 * 1024);
  if (abs < 1024 * 1024 * 1024)
    return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} mb`;
  const gb = n / (1024 * 1024 * 1024);
  return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} gb`;
};

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

  const { sendReply, mutationLoading: sendingReply } = useConversationReply({
    eventId,
    threadId: selectedThreadId,
  });
  const { sendNewMessage, mutationLoading: sendingNew } = useConversationCompose({ eventId });
  const {
    markAsRead,
    markAsUnread,
    mutationLoading: updatingThread,
  } = useConversationThreadUnread({ eventId, threadId: selectedThreadId });

  // Track per-selection auto mark state to avoid repeated triggers
  const autoMarkRef = useRef({ threadId: null, marked: false });
  useEffect(() => {
    autoMarkRef.current = { threadId: selectedThreadId, marked: false };
  }, [selectedThreadId]);

  // Subscribe to inbound/outbound email events for this event; refresh lists/details + toast
  useConversationEvents({
    eventId,
    onEmail: async () => {
      try {
        await Promise.all([refetchThread?.(), refetchThreads?.()]);
      } catch (_) {}
    },
  });

  // When opening an unread thread, mark as read in background and offer Undo
  useEffect(() => {
    const shouldAutoMark =
      selectedThreadId &&
      !threadLoading &&
      thread?.isUnread &&
      autoMarkRef.current.threadId === selectedThreadId &&
      !autoMarkRef.current.marked &&
      !updatingThread;
    if (!shouldAutoMark) return;
    autoMarkRef.current.marked = true;
    (async () => {
      const ok = await markAsRead({ silent: true });
      if (ok) {
        try {
          await Promise.all([refetchThread?.(), refetchThreads?.()]);
        } catch (_) {}
        const tid = toast((t) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Message marked as read</span>
            <Button
              size="sm"
              onClick={async () => {
                toast.dismiss(t.id);
                const undone = await markAsUnread({ silent: true });
                if (undone) {
                  try {
                    await Promise.all([refetchThread?.(), refetchThreads?.()]);
                  } catch (_) {}
                  toast.success("Undone");
                }
              }}
            >
              Undo
            </Button>
          </div>
        ));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId, threadLoading, thread?.isUnread, updatingThread]);

  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState("");
  useEffect(() => {
    // Initialize the recipient when thread changes or new data arrives
    if (selectedThreadId) {
      setReplyTo(responseRecipient || "");
    } else {
      setReplyTo("");
    }
  }, [selectedThreadId, responseRecipient]);
  const [pendingFiles, setPendingFiles] = useState([]); // { id, fileId?, url?, name, size, type, uploading, progress? }
  const [composeMode, setComposeMode] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const EMAIL_ATTACHMENT_MAX_BYTES = 18 * 1024 * 1024; // Keep in sync with server default
  const encodedSize = (n) => Math.ceil(Number(n || 0) / 3) * 4;

  const { upload: uploadFile, loading: uploadingFile } = useFileUploader(
    "/api/file/any",
    {
      // Client-side allowance: 1GB (to match the route)
      maxFileSize: 1024 * 1024 * 1024,
    }
  );

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
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setPendingFiles([]);
    const next = new URLSearchParams(searchParams);
    next.delete("threadId");
    const qs = next.toString();
    const url = `/events/${eventId}/conversations${qs ? `?${qs}` : ""}`;
    navigate(url);
  };

  const sortedMessages = useMemo(() => {
    if (!messages?.length) return [];
    return [...messages].sort((a, b) => {
      const ad = new Date(a?.internalDate || 0).getTime();
      const bd = new Date(b?.internalDate || 0).getTime();
      return bd - ad; // newest first
    });
  }, [messages]);

  const centerList = (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!selectedThreadId && !composeMode && (
        <Empty
          title="No conversation selected"
          text="Select a conversation from the inbox to view messages."
          gradient={false}
        />
      )}
      {!selectedThreadId && composeMode && (
        <>
          <Typography.H2 className="mb-0">New Message</Typography.H2>
          <Card title="Compose">
            <Input
              label="To"
              placeholder="Recipient email(s)"
              value={composeTo}
              onChange={(e) => setComposeTo(e)}
            />
            <Input
              label="Subject"
              placeholder="Subject"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e)}
            />
            <Input
              placeholder="Write your message..."
              value={composeBody}
              onChange={(e) => setComposeBody(e)}
              useTextarea
            />
            <label className="btn">
              Attach files
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const file of files) {
                    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    setPendingFiles((prev) => [
                      ...prev,
                      { id: tempId, fileId: null, url: null, name: file.name, size: file.size, type: file.type, uploading: true, progress: 0 },
                    ]);
                    try {
                      const result = await uploadFile([file], {
                        onProgress: ({ progress }) => {
                          setPendingFiles((prev) =>
                            prev.map((p) => (p.id === tempId ? { ...p, progress: Number(progress || 0) } : p))
                          );
                        },
                      });
                      if (result?.fileId) {
                        setPendingFiles((prev) =>
                          prev.map((p) =>
                            p.id === tempId
                              ? { ...p, id: result.fileId, fileId: result.fileId, url: result.url, uploading: false, progress: 1 }
                              : p
                          )
                        );
                      } else {
                        setPendingFiles((prev) => prev.filter((p) => p.id !== tempId));
                      }
                    } catch (_) {
                      setPendingFiles((prev) => prev.filter((p) => p.id !== tempId));
                    }
                  }
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {pendingFiles?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Typography.Text className="mb-0 text-muted">
                    {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} ready
                  </Typography.Text>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {pendingFiles.map((f, idx) => {
                      const willLink = encodedSize(f?.size || 0) > EMAIL_ATTACHMENT_MAX_BYTES;
                      return (
                        <span
                          key={`${f.id || f.fileId || idx}`}
                          className="badge"
                          style={{
                            background: "var(--tblr-gray-200)",
                            color: "var(--tblr-dark)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            maxWidth: 260,
                            position: "relative",
                            overflow: "hidden",
                          }}
                          title={f.name}
                        >
                          {f.uploading && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: `${Math.round((f.progress || 0) * 100)}%`,
                                background: "var(--tblr-primary)",
                                opacity: 0.15,
                                zIndex: 0,
                                transition: "width 120ms linear",
                              }}
                            />
                          )}
                          {f.uploading ? <Spinner size={"sm"} /> : <Icon i="paperclip" />}
                          <span
                            style={{
                              display: "inline-block",
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            {f.name}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: willLink ? "var(--tblr-red)" : "var(--tblr-green)",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            {willLink ? "Link" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter((p) => (p.id || p.fileId) !== (f.id || f.fileId))
                              )
                            }
                            className="btn btn-icon btn-link"
                            style={{ color: "var(--tblr-dark)", position: "relative", zIndex: 1 }}
                          >
                            <Icon i="x" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <Button
                variant="subtle"
                onClick={() => {
                  setComposeMode(false);
                  setComposeTo("");
                  setComposeSubject("");
                  setComposeBody("");
                  setPendingFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={async () => {
                  if (!composeBody.trim() || !composeTo.trim()) return;
                  const { ok, threadId } = await sendNewMessage({
                    to: composeTo,
                    subject: composeSubject || undefined,
                    text: composeBody,
                    fileIds: pendingFiles
                      .filter((f) => !f.uploading && f.fileId)
                      .map((f) => f.fileId),
                  });
                  if (ok) {
                    setComposeMode(false);
                    setComposeTo("");
                    setComposeSubject("");
                    setComposeBody("");
                    setPendingFiles([]);
                    try { await refetchThreads?.(); } catch (_) {}
                    if (threadId) navigate(`/events/${eventId}/conversations/${threadId}`);
                  }
                }}
                disabled={
                  !composeBody.trim() ||
                  !composeTo.trim() ||
                  sendingNew ||
                  uploadingFile ||
                  pendingFiles.some((f) => f.uploading)
                }
                loading={sendingNew}
              >
                Send
              </Button>
            </div>
          </Card>
        </>
      )}
      {selectedThreadId && !threadLoading && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="sm"
            onClick={async () => {
              const unread = Boolean(thread?.isUnread);
              const ok = unread ? await markAsRead() : await markAsUnread();
              if (ok) {
                try {
                  await Promise.all([refetchThread?.(), refetchThreads?.()]);
                } catch (_) {}
              }
            }}
            disabled={updatingThread}
            loading={updatingThread}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon i={thread?.isUnread ? "mail-opened" : "mail"} />
              {thread?.isUnread ? "Mark as read" : "Mark as unread"}
            </span>
          </Button>
        </div>
      )}
      {selectedThreadId && threadLoading && (
        <Loading
          title="Loading conversation"
          text="Fetching messages…"
          gradient={false}
        />
      )}
      {selectedThreadId && !threadLoading && (
        <>
          <Typography.H2 className="mb-0">
            {thread?.subject || "(no subject)"}
          </Typography.H2>
          <Card title="Reply">
            <Input
              label="To"
              placeholder="Recipient email(s)"
              value={replyTo}
              onChange={(e) => setReplyTo(e)}
            />
            <Input
              placeholder="Write your reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e)}
              useTextarea
            />
            <label className="btn">
              Attach files
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const file of files) {
                    const tempId = `temp-${Date.now()}-${Math.random()
                      .toString(36)
                      .slice(2, 8)}`;
                    setPendingFiles((prev) => [
                      ...prev,
                      {
                        id: tempId,
                        fileId: null,
                        url: null,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        uploading: true,
                        progress: 0,
                      },
                    ]);
                    try {
                      const result = await uploadFile([file], {
                        onProgress: ({ progress }) => {
                          setPendingFiles((prev) =>
                            prev.map((p) =>
                              p.id === tempId
                                ? { ...p, progress: Number(progress || 0) }
                                : p
                            )
                          );
                        },
                      });
                      if (result?.fileId) {
                        setPendingFiles((prev) =>
                          prev.map((p) =>
                            p.id === tempId
                              ? {
                                  ...p,
                                  id: result.fileId,
                                  fileId: result.fileId,
                                  url: result.url,
                                  uploading: false,
                                  progress: 1,
                                }
                              : p
                          )
                        );
                      } else {
                        setPendingFiles((prev) =>
                          prev.filter((p) => p.id !== tempId)
                        );
                      }
                    } catch (_) {
                      setPendingFiles((prev) =>
                        prev.filter((p) => p.id !== tempId)
                      );
                    }
                  }
                  e.target.value = ""; // reset input
                }}
                style={{ display: "none" }}
              />
            </label>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {pendingFiles?.length ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <Typography.Text className="mb-0 text-muted">
                    {pendingFiles.length} file
                    {pendingFiles.length === 1 ? "" : "s"} ready
                  </Typography.Text>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {pendingFiles.map((f, idx) => {
                      const willLink =
                        encodedSize(f?.size || 0) > EMAIL_ATTACHMENT_MAX_BYTES;
                      return (
                        <span
                          key={`${f.id || f.fileId || idx}`}
                          className="badge"
                          style={{
                            background: "var(--tblr-gray-200)",
                            color: "var(--tblr-dark)",
                            padding: "4px 8px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            maxWidth: 260,
                            position: "relative",
                            overflow: "hidden",
                          }}
                          title={f.name}
                        >
                          {f.uploading && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                left: 0,
                                width: `${Math.round(
                                  (f.progress || 0) * 100
                                )}%`,
                                background: "var(--tblr-primary)",
                                opacity: 0.15,
                                zIndex: 0,
                                transition: "width 120ms linear",
                              }}
                            />
                          )}
                          {f.uploading ? (
                            <Spinner size={"sm"} />
                          ) : (
                            <Icon i="paperclip" />
                          )}
                          <span
                            style={{
                              display: "inline-block",
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            {f.name}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: willLink
                                ? "var(--tblr-red)"
                                : "var(--tblr-green)",
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            {willLink ? "Link" : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingFiles((prev) =>
                                prev.filter(
                                  (p) =>
                                    (p.id || p.fileId) !== (f.id || f.fileId)
                                )
                              )
                            }
                            className="btn btn-link p-0"
                            title="Remove"
                            style={{
                              marginLeft: 2,
                              color: "var(--tblr-dark)",
                              textDecoration: "none",
                              lineHeight: 1,
                              position: "relative",
                              zIndex: 1,
                            }}
                          >
                            <Icon i="x" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 10,
              }}
            >
              <Button
                color="primary"
                onClick={async () => {
                  if (!replyBody.trim()) return;
                  const ok = await sendReply({
                    to: replyTo || undefined,
                    text: replyBody,
                    fileIds: pendingFiles
                      .filter((f) => !f.uploading && f.fileId)
                      .map((f) => f.fileId),
                  });
                  if (ok) {
                    setReplyBody("");
                    setReplyTo(responseRecipient || "");
                    setPendingFiles([]);
                    // refresh thread and list to show the new email
                    try {
                      await Promise.all([
                        refetchThread?.(),
                        refetchThreads?.(),
                      ]);
                    } catch (_) {}
                  }
                }}
                disabled={
                  !replyBody.trim() ||
                  sendingReply ||
                  uploadingFile ||
                  pendingFiles.some((f) => f.uploading)
                }
                loading={sendingReply}
              >
                Send
              </Button>
            </div>
          </Card>
        </>
      )}
      {selectedThreadId && !threadLoading && messages?.length === 0 && (
        <Empty
          title="No messages"
          text="This conversation has no messages."
          gradient={false}
        />
      )}
      {selectedThreadId &&
        !threadLoading &&
        sortedMessages.map((m) => (
          <Card
            key={m.id}
            title={
              <Col align="flex-start" gap={0.25} style={{ width: "100%" }}>
                <Row
                  gap={0.5}
                  align="center"
                  justify="space-between"
                  style={{ width: "100%" }}
                >
                  <Typography.H3 className="mb-0">
                    <span className="text-muted">From:</span>{" "}
                    {m.headers?.from || ""}
                  </Typography.H3>
                </Row>
                <Row gap={0.5} align="center">
                  <Typography.Text className="mb-0 text-muted">
                    To:
                  </Typography.Text>
                  <Typography.Text className="mb-0">
                    {m.headers?.to || ""}
                  </Typography.Text>
                </Row>
                <Row gap={0.5} align="center">
                  <Typography.Text className="mb-0 text-muted">
                    Sent:
                  </Typography.Text>
                  <Typography.Text className="mb-0">
                    {m.internalDate
                      ? moment(m.internalDate).format("MMM DD, h:mm a")
                      : ""}
                  </Typography.Text>
                </Row>
                {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
                  <>
                    <Typography.Text className="mb-0">
                      <span className="text-muted">Attachments:</span>{" "}
                    </Typography.Text>
                    <Row
                      gap={1}
                      align="flex-start"
                      style={{
                        overflowX: "auto",
                        paddingBottom: 4,
                        width: "100%",
                      }}
                    >
                      {m.attachments.map((a) => {
                        const isImage = String(a?.mimeType || "").startsWith(
                          "image/"
                        );
                        const label = a?.filename || "attachment";
                        return (
                          <a
                            key={a.attachmentId}
                            href={a.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card"
                            style={{
                              padding: 8,
                              maxWidth: 520,
                              overflow: "hidden",
                              display: "inline-block",
                              flex: "0 0 auto",
                              boxShadow: "none",
                              transition: "none",
                              textDecoration: "none",
                              filter: "none",
                            }}
                            title={label}
                          >
                            <Row gap={1} align="center">
                              {isImage ? (
                                <img
                                  src={a.downloadUrl}
                                  alt={label}
                                  style={{
                                    maxWidth: 120,
                                    maxHeight: 120,
                                    objectFit: "cover",
                                    borderRadius: 4,
                                  }}
                                />
                              ) : (
                                <Icon i="file" size={48} />
                              )}
                              <Col gap={0.25} align="flex-start">
                                <Typography.Text
                                  className="mb-0"
                                  style={{ textAlign: "left" }}
                                >
                                  {label}
                                </Typography.Text>
                                <Typography.Text
                                  className="mb-0 text-muted"
                                  style={{ textAlign: "left" }}
                                >
                                  {a?.mimeType || ""}
                                  {typeof a?.size === "number"
                                    ? `, ${formatBytes(a.size)}`
                                    : ""}
                                </Typography.Text>
                              </Col>
                            </Row>
                          </a>
                        );
                      })}
                    </Row>
                  </>
                ) : null}
              </Col>
            }
          >
            {m.htmlBody ? (
              <SafeHtml html={m.htmlBody} />
            ) : (
              <Typography.Text style={{ whiteSpace: "pre-wrap" }}>
                {m.textBody || m.snippet || "(no content)"}
              </Typography.Text>
            )}
            {/* Attachments are now rendered in the header/title section above */}
          </Card>
        ))}
    </div>
  );

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
        centerChildren={centerList}
        rightIcon="info-circle"
        rightTitle="Details"
        rightChildren={rightDetails}
      />
    </EventPage>
  );
};
