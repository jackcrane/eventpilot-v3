import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemParticipantDisconnected = (log) => {
  const ids = log?.data?.participantRegistrationIds || [];
  const count = Array.isArray(ids) ? ids.length : 0;
  const title =
    count === 1 ? "Participant disconnected" : "Participants disconnected";
  const desc =
    count > 0
      ? `${count} participant registration${count === 1 ? "" : "s"} unlinked.`
      : "Participant registrations unlinked.";

  return {
    title,
    description: desc,
    time: moment(log.createdAt).format(DATETIME_FORMAT),
    icon: "user-minus",
    iconBgColor: "red",
  };
};

