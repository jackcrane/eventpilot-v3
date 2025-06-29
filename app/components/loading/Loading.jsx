import React from "react";
import { Typography, Spinner } from "tabler-react-2";
import { Col, Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";

export const Loading = ({
  title = "Loading",
  text = "We are gathering your data...",
  gradient = true,
}) => {
  return (
    <div
      className="p-4"
      style={{
        background:
          gradient &&
          `radial-gradient(circle,rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) 70%, rgba(255, 255, 255, 1) 100%)`,
      }}
    >
      <Col>
        <Spinner size="lg" />
        <Typography.H3 className="mt-3">{title}</Typography.H3>
        <Typography.Text>{text}</Typography.Text>
      </Col>
    </div>
  );
};
