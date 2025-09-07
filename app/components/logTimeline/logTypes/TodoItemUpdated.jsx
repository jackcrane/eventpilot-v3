import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemUpdated = {
  title: "Updated",
  description: "Todo was updated.",
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "pencil",
  iconBgColor: "blue",
};

