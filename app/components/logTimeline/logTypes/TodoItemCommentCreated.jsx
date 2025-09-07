import moment from "moment";
import { DATETIME_FORMAT } from "../../../util/Constants";

export const TodoItemCommentCreated = {
  title: "Comment added",
  description: "A comment was added.",
  time: (log) => moment(log.createdAt).format(DATETIME_FORMAT),
  icon: "notes",
  iconBgColor: "green",
};

