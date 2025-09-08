import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemVolunteerConnected = (log) => {
  const ids = log?.data?.volunteerRegistrationIds || [];
  const count = Array.isArray(ids) ? ids.length : 0;
  const title = count === 1 ? "Volunteer connected" : "Volunteers connected";
  const desc =
    count > 0
      ? `${count} volunteer registration${count === 1 ? "" : "s"} linked.`
      : "Volunteer registrations linked.";

  return {
    title,
    description: desc,
    time: moment(log.createdAt).format(DATETIME_FORMAT),
    icon: "user-plus",
    iconBgColor: "green",
  };
};

