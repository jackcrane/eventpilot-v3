import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemParticipantConnected = (log) => {
  const ids = log?.data?.participantRegistrationIds || [];
  const count = Array.isArray(ids) ? ids.length : 0;
  const title = count === 1 ? "Participant connected" : "Participants connected";
  const desc =
    count > 0
      ? `${count} participant registration${count === 1 ? "" : "s"} linked.`
      : "Participant registrations linked.";

  return {
    title,
    description: desc,
    time: moment(log.createdAt).format(DATETIME_FORMAT),
    icon: "user-plus",
    iconBgColor: "green",
  };
};

