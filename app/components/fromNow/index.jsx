import moment from "moment";

export const FromNow = ({ date }) => {
  return <span>{moment(date).fromNow()}</span>;
};
