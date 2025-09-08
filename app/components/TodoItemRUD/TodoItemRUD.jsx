import React, { useEffect, useState } from "react";
import {
  Typography,
  Button,
  DropdownInput,
  Util,
  SegmentedControl,
} from "tabler-react-2";
import { Input } from "tabler-react-2";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import { useTodo } from "../../hooks/useTodo";
import { useTodoComments } from "../../hooks/useTodoComments";
import { useFileUploader } from "../../hooks/useFileUploader";
import { Timeline } from "tabler-react-2";
import moment from "moment";
import { DATETIME_FORMAT } from "../../util/Constants";
import { isImage } from "../../util/isImage";
import LogViewer from "../logTimeline/LogViewer";
import { TodoItemAssociations } from "./TodoItemAssociations";
import { Loading } from "../loading/Loading";

const TITLE_MAP = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TodoItemRUD = ({ eventId, todoId, onClose }) => {
  const { todo, loading, updateTodo, deleteTodo, mutationLoading } = useTodo({
    eventId,
    todoId,
  });
  const { comments = [], addComment } = useTodoComments({ eventId, todoId });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("NOT_STARTED");
  const [commentText, setCommentText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]); // { fileId, url }
  const [tab, setTab] = useState("comments");

  const { upload, loading: uploading } = useFileUploader("/api/file/any", {
    onSuccessfulUpload: (data) => {
      if (!data?.fileId) return;
      setPendingFiles((prev) => [
        ...prev,
        { fileId: data.fileId, url: data.url },
      ]);
    },
  });

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || "");
      setContent(todo.content || "");
      setStatus(todo.status || "NOT_STARTED");
    }
  }, [todo]);

  const save = async () => {
    const ok = await updateTodo({ title, content, status });
    return ok;
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text && pendingFiles.length === 0) return;
    const ok = await addComment({
      text: text || "",
      fileIds: pendingFiles.map((f) => f.fileId),
    });
    if (ok) {
      setCommentText("");
      setPendingFiles([]);
    }
  };

  if (loading) return <Loading />;
  if (!todo) return <div style={{ padding: 16 }}>Not found</div>;

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">TODO</Typography.H5>
      <Row align="center" justify="space-between" className="mb-2">
        <Typography.H1 className="mb-0">Details</Typography.H1>
        <Row gap={0.5}>
          <Button
            variant="danger"
            outline
            onClick={async () => {
              await deleteTodo(onClose);
            }}
            disabled={mutationLoading}
          >
            <Icon i="trash" />
          </Button>
          <Button onClick={save} loading={mutationLoading} variant="primary">
            Save
          </Button>
        </Row>
      </Row>

      <DropdownInput
        label="Status"
        items={[
          {
            id: "NOT_STARTED",
            value: "NOT_STARTED",
            label: TITLE_MAP.not_started,
          },
          {
            id: "IN_PROGRESS",
            value: "IN_PROGRESS",
            label: TITLE_MAP.in_progress,
          },
          { id: "COMPLETED", value: "COMPLETED", label: TITLE_MAP.completed },
          { id: "CANCELLED", value: "CANCELLED", label: TITLE_MAP.cancelled },
        ]}
        value={status}
        onChange={(i) => setStatus(i.value)}
        className="mb-2"
        aprops={{ style: { width: "100%", justifyContent: "space-between" } }}
      />

      <Input label="Title" value={title} onChange={setTitle} required />
      <Input
        label="Details"
        value={content}
        onChange={setContent}
        useTextarea
        inputProps={{ rows: 6 }}
      />

      <div className="mt-3 mb-3">
        <SegmentedControl
          value={tab}
          onChange={(e) => setTab(e.id)}
          items={[
            { id: "comments", label: "Comments" },
            { id: "logs", label: "Logs" },
            { id: "associations", label: "Associations" },
          ]}
        />
      </div>

      {tab === "comments" && (
        <div>
          <div className="card p-2 mb-2">
            <label className="form-label">Comment</label>
            <textarea
              className="form-control mb-2"
              placeholder="Type your comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            {pendingFiles.length > 0 && (
              <Row
                gap={0.5}
                align="center"
                className="mb-2"
                style={{ flexWrap: "wrap" }}
              >
                {pendingFiles.map((f) => (
                  <a
                    key={f.fileId}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="badge bg-secondary-lt"
                    style={{ textDecoration: "none" }}
                  >
                    <Icon i="paperclip" />
                    <span style={{ marginLeft: 6 }}>Attachment</span>
                  </a>
                ))}
              </Row>
            )}
            <Row gap={0.5} align="center" justify="between">
              <Row gap={0.5} align="center">
                <label className="btn">
                  <Icon i="paperclip" /> Attach files
                  <input
                    type="file"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        await upload([file]);
                      }
                      e.target.value = ""; // reset input
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </Row>
              <Button
                onClick={submitComment}
                disabled={!commentText.trim() && pendingFiles.length === 0}
                loading={uploading}
              >
                Post
              </Button>
            </Row>
          </div>

          <Util.Hr text="Comments" />
          <div>
            {comments.length === 0 ? (
              <Typography.Text className="text-muted">
                No comments yet.
              </Typography.Text>
            ) : (
              <Timeline
                dense
                events={comments.map((c) => ({
                  title: "Comment",
                  description: (
                    <div>
                      {c.text && (
                        <Typography.Text className="mb-1">
                          {c.text}
                        </Typography.Text>
                      )}
                      {Array.isArray(c.files) && c.files.length > 0 && (
                        <div>
                          {c.files.map((f) => (
                            <div key={f.id} style={{ marginTop: 6 }}>
                              {isImage(f.mimetype) && (
                                <img
                                  src={f.location}
                                  alt={f.originalname}
                                  style={{ maxWidth: 300, maxHeight: 150 }}
                                  className="mb-1"
                                />
                              )}
                              <Row gap={0.5} align="flex-start">
                                <Icon i="download" />
                                <a
                                  href={f.location}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {f.originalname} ({f.mimetype})
                                </a>
                              </Row>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                  time: moment(c.createdAt).format(DATETIME_FORMAT),
                  icon: <Icon i="notes" />,
                  iconBgColor: "green",
                }))}
              />
            )}
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div>
          {!todo?.logs || todo.logs.length === 0 ? (
            <Typography.Text className="text-muted">
              No logs yet.
            </Typography.Text>
          ) : (
            <LogViewer logs={todo.logs} dense />
          )}
        </div>
      )}

      {tab === "associations" && (
        <div>
          <TodoItemAssociations
            todo={todo}
            eventId={eventId}
            updateTodo={updateTodo}
          />
        </div>
      )}
    </div>
  );
};

export default TodoItemRUD;
