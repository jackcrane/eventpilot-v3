import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Card,
  Button,
  Input,
  Spinner,
  useOffcanvas,
} from "tabler-react-2";
import { Row, Col } from "../../../../../../util/Flex";
import { Icon } from "../../../../../../util/Icon";
import { Loading } from "../../../../../../components/loading/Loading";
import { Empty } from "../../../../../../components/empty/Empty";
import toast from "react-hot-toast";
import { Message } from "./Message";
import { useFileUploader } from "../../../../../../hooks/useFileUploader";
import { useConversationReply } from "../../../../../../hooks/useConversationReply";
import { useConversationCompose } from "../../../../../../hooks/useConversationCompose";
import { useConversationThread } from "../../../../../../hooks/useConversationThread";
import { useTodos } from "../../../../../../hooks/useTodos";
import { TodoCreateForm } from "../../../../../../components/TodoCreateForm/TodoCreateForm";

//

export const Conversation = ({
  eventId,
  selectedThreadId,
  thread,
  messages,
  responseRecipient,
  participants,
  threadLoading,
  refetchThread,
  refetchThreads,
  composeMode,
  setComposeMode,
}) => {
  const navigate = useNavigate();

  // Offcanvas for creating a Todo
  const { offcanvas, OffcanvasElement, close } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1051 },
  });

  // Reply state
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Compose state (local fields; composeMode flag comes from parent)
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Upload state
  const [pendingFiles, setPendingFiles] = useState([]); // { id, fileId?, url?, name, size, type, uploading, progress? }
  const EMAIL_ATTACHMENT_MAX_BYTES = 18 * 1024 * 1024; // Keep in sync with server default
  const encodedSize = (n) => Math.ceil(Number(n || 0) / 3) * 4;
  const { upload: uploadFile, loading: uploadingFile } = useFileUploader(
    "/api/file/any",
    { maxFileSize: 1024 * 1024 * 1024 }
  );

  // Actions
  const { sendReply, mutationLoading: sendingReply } = useConversationReply({
    eventId,
    threadId: selectedThreadId,
  });
  const { sendNewMessage, mutationLoading: sendingNew } =
    useConversationCompose({ eventId });
  // Combined thread actions (unread toggle + delete)
  const {
    markAsRead,
    markAsUnread,
    updatingThread,
    deleteThread,
    deletingThread,
    DeleteConfirmElement,
  } = useConversationThread({ eventId, threadId: selectedThreadId });

  // Todos actions
  const { createTodo } = useTodos({ eventId });

  // Initialize replyTo when thread or default recipient changes
  useEffect(() => {
    if (selectedThreadId) setReplyTo(responseRecipient || "");
    else setReplyTo("");
  }, [selectedThreadId, responseRecipient]);

  // Track per-selection auto mark state to avoid repeated triggers
  const autoMarkRef = useRef({ threadId: null, marked: false });
  useEffect(() => {
    autoMarkRef.current = { threadId: selectedThreadId, marked: false };
  }, [selectedThreadId]);

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
        } catch (e) {
          console.error(e);
        }
        toast((t) => (
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
                  } catch (e) {
                    console.error(e);
                  }
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

  const sortedMessages = useMemo(() => {
    if (!messages?.length) return [];
    return [...messages].sort((a, b) => {
      const ad = new Date(a?.internalDate || 0).getTime();
      const bd = new Date(b?.internalDate || 0).getTime();
      return bd - ad; // newest first
    });
  }, [messages]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {DeleteConfirmElement}
      {OffcanvasElement}
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
                    } catch (e) {
                      console.error(e);
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
                            className="btn btn-icon btn-link"
                            style={{
                              color: "var(--tblr-dark)",
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
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
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
                    try {
                      await refetchThreads?.();
                    } catch (e) {
                      console.error(e);
                    }
                    if (threadId)
                      navigate(`/events/${eventId}/conversations/${threadId}`);
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

      {selectedThreadId && threadLoading && (
        <Loading
          title="Loading conversation"
          text="Fetching messages…"
          gradient={false}
        />
      )}

      {selectedThreadId && !threadLoading && (
        <>
          <div>
            <Typography.H2 className="mb-0">
              {thread?.subject || "(no subject)"}
            </Typography.H2>
            <div
              style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}
            >
              <Button
                size="sm"
                onClick={async () => {
                  const unread = Boolean(thread?.isUnread);
                  const ok = unread ? await markAsRead() : await markAsUnread();
                  if (ok) {
                    try {
                      await Promise.all([
                        refetchThread?.(),
                        refetchThreads?.(),
                      ]);
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                disabled={updatingThread}
                loading={updatingThread}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon i={thread?.isUnread ? "mail-opened" : "mail"} />
                  {thread?.isUnread ? "Mark as read" : "Mark as unread"}
                </span>
              </Button>
              <Button
                size="sm"
                color="success"
                onClick={() =>
                  offcanvas({
                    content: (
                      <TodoCreateForm
                        initialCrmPeople={
                          Array.isArray(participants) ? participants : []
                        }
                        showCrmSection
                        linkedEmail={{
                          id: selectedThreadId,
                          subject: thread?.subject || "(no subject)",
                        }}
                        onClose={close}
                        onCreate={async (vals, { linkEmail } = {}) => {
                          const ok = await createTodo({
                            ...vals,
                            conversationIds:
                              linkEmail !== false && selectedThreadId
                                ? [selectedThreadId]
                                : undefined,
                          });
                          if (ok) close();
                        }}
                      />
                    ),
                  })
                }
              >
                <Icon i="plus" />
                Todo item
              </Button>
              <Button
                size="sm"
                color="danger"
                outline
                onClick={async () => {
                  const ok = await deleteThread({
                    onOptimistic: () => {
                      navigate(`/events/${eventId}/conversations`);
                    },
                    onSuccess: async () => {
                    try {
                      await refetchThreads?.();
                    } catch (e) {
                      console.error(e);
                    }
                    },
                  });
                  if (!ok) return;
                }}
                disabled={deletingThread}
                loading={deletingThread}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon i="trash" />
                  Delete
                </span>
              </Button>
            </div>
          </div>
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
                    } catch (e) {
                      console.error(e);
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
                    try {
                      await Promise.all([
                        refetchThread?.(),
                        refetchThreads?.(),
                      ]);
                    } catch (e) {
                      console.error(e);
                    }
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
        sortedMessages.map((m) => <Message key={m.id} message={m} />)}
    </div>
  );
};
