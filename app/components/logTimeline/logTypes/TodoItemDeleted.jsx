import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemDeleted = {
  title: "Deleted",
  description: "Todo was deleted.",
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "trash",
  iconBgColor: "red",
};

