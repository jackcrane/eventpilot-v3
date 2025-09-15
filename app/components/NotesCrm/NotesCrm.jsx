import React, { useMemo, useState } from "react";
import { Typography, Button, Util, Timeline } from "tabler-react-2";
import { useCrmNotes } from "../../hooks/useCrmNotes";
import { Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";
import moment from "moment";
import { DATETIME_FORMAT } from "../../util/Constants";
import { isImage } from "../../util/isImage";

/**
 * NotesCrm: reusable notes UI for a CRM person.
 * Props:
 * - eventId: string (required)
 * - personId: string (required)
 * - hideTitle: boolean (optional; default false)
 */
export const NotesCrm = ({ eventId, personId, hideTitle = false }) => {
  const { notes, loading, addNote, uploadNotesFiles, mutationLoading } =
    useCrmNotes({ eventId, personId });

  const [note, setNote] = useState("");
  const canSubmit = useMemo(() => note.trim().length > 0, [note]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    if (await addNote(note.trim())) setNote("");
  };

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await uploadNotesFiles(files);
    e.target.value = ""; // reset input
  };

  return (
    <div className="mt-1">
      {!hideTitle && (
        <>
          <Typography.H2>Notes</Typography.H2>
          <Typography.Text className="text-muted">
            Add private notes and attach files to this contact. The contact will not
            be able to view these notes.
          </Typography.Text>
        </>
      )}

      <Util.Hr text="Add a note" />
      <div className="card p-2 mb-2">
        <label className="form-label">Note</label>
        <textarea
          className="form-control mb-2"
          placeholder="Type your note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
        <Row gap={0.5} align="center" justify="between">
          <Row gap={0.5} align="center">
            <label className="btn">
              <Icon i="paperclip" /> Attach files
              <input
                type="file"
                multiple
                onChange={onFilesSelected}
                style={{ display: "none" }}
              />
            </label>
          </Row>
          <Button onClick={onSubmit} disabled={!canSubmit} loading={mutationLoading}>
            Add note
          </Button>
        </Row>
      </div>

      <Util.Hr text="Timeline" />
      <div>
        {loading ? (
          <Typography.Text className="text-muted">Loading notes...</Typography.Text>
        ) : notes.length === 0 ? (
          <Typography.Text className="text-muted">No notes yet.</Typography.Text>
        ) : (
          <Timeline
            dense
            events={notes?.map((n) => ({
              title: n.type === "file" ? "File" : "Note",
              description: (
                <div>
                  {n.type === "text" && (
                    <Typography.Text className="mb-0">{n.text}</Typography.Text>
                  )}
                  {n.type === "file" && (
                    <div>
                      {isImage(n.file?.mimetype) && (
                        <img
                          src={n.file?.url}
                          alt={n.file?.name}
                          style={{ maxWidth: 300, maxHeight: 150 }}
                          className="mb-2"
                        />
                      )}
                      <Row gap={0.5} align="flex-start">
                        <Icon i="download" />
                        <a href={n.file?.url} target="_blank" rel="noreferrer">
                          {n.file?.name} ({n.file?.mimetype})
                        </a>
                      </Row>
                    </div>
                  )}
                </div>
              ),
              time: moment(n.createdAt).format(DATETIME_FORMAT),
              icon: n.type === "file" ? <Icon i="paperclip" /> : <Icon i="notes" />,
              iconBgColor: n.type === "file" ? "blue" : "green",
            }))}
          />
        )}
      </div>
    </div>
  );
};

export default NotesCrm;

