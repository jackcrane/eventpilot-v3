import React from "react";
import { Row } from "../../util/Flex";
import { Input, Button } from "tabler-react-2";
import { Filters } from "../filters/Filters";
import { AiSegmentBadge } from "../crmAi/AiSegmentBadge";
import { Icon } from "../../util/Icon";

export const CrmFilterBar = ({
  search,
  setSearch,
  filterFieldDefs,
  setFilters,
  initialFilters,
  showAiBadge,
  aiTitle,
  aiCollapsed,
  onToggleAi,
  onRefineAi,
  onCreateMailingList,
  onClearAi,
  onAskAi,
}) => {
  return (
    <Row gap={1} className="mb-3" align="center" wrap>
      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={setSearch}
        className="mb-0"
        style={{ minWidth: 240 }}
      />
      <Filters
        onFilterChange={setFilters}
        fields={filterFieldDefs}
        initial={initialFilters}
      />
      {showAiBadge && (
        <AiSegmentBadge
          title={aiTitle}
          collapsed={aiCollapsed}
          onToggle={onToggleAi}
          onRefine={onRefineAi}
          onCreateMailingList={onCreateMailingList}
          onClear={onClearAi}
        />
      )}
      <Button variant="outline" onClick={onAskAi} className="ai-button">
        <Icon i="sparkles" /> Ask AI
      </Button>
    </Row>
  );
};
