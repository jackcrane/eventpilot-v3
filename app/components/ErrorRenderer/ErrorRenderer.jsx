import z from "zod";

export const ErrorRenderer = ({ error, dictionary }) => {
  const flat = z.flattenError(error);

  return <></>;
};
