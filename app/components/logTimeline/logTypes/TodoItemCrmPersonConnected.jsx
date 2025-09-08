import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemCrmPersonConnected = (log) => {
  const ids = log?.data?.crmPersonIds || [];
  const count = Array.isArray(ids) ? ids.length : 0;
  const title = count === 1 ? "CRM contact connected" : "CRM contacts connected";
  const desc =
    count > 0
      ? `${count} CRM contact${count === 1 ? "" : "s"} linked.`
      : "CRM contacts linked.";

  return {
    title,
    description: desc,
    time: moment(log.createdAt).format(DATETIME_FORMAT),
    icon: "user-plus",
    iconBgColor: "green",
  };
};

