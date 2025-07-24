import React from "react";
import { Typography, Button } from "tabler-react-2";
import { Col, Row } from "../../util/Flex";
import { Icon } from "../../util/Icon";

export const Empty = ({
  icon = "alert-triangle",
  title = "Oops! There's nothing here...",
  text = "There is nothing here to view right now.",
  onCtaClick,
  ctaText = "Create Something",
  ctaIcon = "plus",
  ctaProps = {},
  gradient = true,
  ctaElement,
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
        <Icon i={icon} size={80} className="text-muted" />
        <Typography.H3>{title}</Typography.H3>
        <Typography.Text>{text}</Typography.Text>
        {ctaElement}
        {onCtaClick && (
          <Button
            onClick={onCtaClick}
            {...ctaProps}
            variant="secondary"
            size="sm"
          >
            <Row gap={1}>
              {icon && <Icon i={ctaIcon} />}
              {ctaText}
            </Row>
          </Button>
        )}
      </Col>
    </div>
  );
};
