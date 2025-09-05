import React from "react";
import classNames from "classnames";
import { Button, Typography } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import filterStyles from "../filters/filters.module.css";

export const AiSegmentBadge = ({
  title,
  collapsed,
  onToggle,
  onRefine,
  onClear,
}) => {
  return (
    <Row gap={1}>
      <div className="card p-0 px-1">
        <Row gap={0} align="center">
          <div className="p-1" title="AI segment">
            <Icon i="sparkles" />
          </div>
          <div
            className={classNames(filterStyles.animatedContainer, {
              [filterStyles.collapsed]: collapsed,
              [filterStyles.expanded]: !collapsed,
            })}
            style={{ minWidth: collapsed ? 0 : 200 }}
          >
            <div
              className="p-1"
              style={{
                maxWidth: 350,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={title || "AI Filter"}
            >
              <Typography.B className="mb-0">{title || "AI Filter"}</Typography.B>
            </div>
            <div className="p-1">
              <Button className="p-1" ghost onClick={onRefine}>
                <Icon i="pencil" /> refine
              </Button>
            </div>
          </div>
          <div className="p-1">
            <Button className="p-1" ghost variant="secondary" onClick={onToggle}>
              <Icon i={collapsed ? "chevron-right" : "chevron-left"} />
            </Button>
            <Button className="p-1" ghost variant="danger" onClick={onClear}>
              <Icon i="trash" />
            </Button>
          </div>
        </Row>
      </div>
    </Row>
  );
};

