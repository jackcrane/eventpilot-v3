import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemCreated = {
  title: "Created",
  description: "Todo was created.",
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "plus",
  iconBgColor: "green",
};

