import React from "react";
import { Typography } from "tabler-react-2";

export const TodoItemAssociations = ({ todo, eventId }) => {
  return (
    <div className="card p-2">
      <div className="mb-2">
        <Typography.B className="mb-0">Conversation</Typography.B>
        <div>
          {todo?.conversationId ? (
            <a
              href={`/events/${eventId}/conversations/${todo.conversationId}`}
              className="text-primary"
            >
              Open conversation
            </a>
          ) : (
            <Typography.Text className="text-muted">None</Typography.Text>
          )}
        </div>
      </div>
      <div className="mb-2">
        <Typography.B className="mb-0">Session</Typography.B>
        <div>
          {todo?.sessionId ? (
            <a
              href={`/events/${eventId}/session/${todo.sessionId}`}
              className="text-primary"
            >
              Open session
            </a>
          ) : (
            <Typography.Text className="text-muted">None</Typography.Text>
          )}
        </div>
      </div>
      <div className="mb-2">
        <Typography.B className="mb-0">Participant Registration</Typography.B>
        <div>
          {todo?.participantRegistrationId ? (
            <Typography.Text className="mb-0">
              ID: {todo.participantRegistrationId}
            </Typography.Text>
          ) : (
            <Typography.Text className="text-muted">None</Typography.Text>
          )}
        </div>
      </div>
      <div className="mb-0">
        <Typography.B className="mb-0">Volunteer Registration</Typography.B>
        <div>
          {todo?.volunteerRegistrationId ? (
            <Typography.Text className="mb-0">
              ID: {todo.volunteerRegistrationId}
            </Typography.Text>
          ) : (
            <Typography.Text className="text-muted">None</Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoItemAssociations;

