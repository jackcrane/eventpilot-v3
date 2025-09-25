import React from "react";
import { Row } from "../../util/Flex";
import { Input } from "tabler-react-2";
import { Filters } from "../filters/Filters";

const getValue = (input) => {
  if (typeof input === "string") return input;
  if (input && typeof input === "object" && "target" in input) {
    return input.target?.value ?? "";
  }
  return String(input ?? "");
};

export const CampaignFilterBar = ({
  search,
  setSearch,
  filterFieldDefs,
  onFiltersChange,
  initialFilters,
  placeholder = "Search campaigns...",
}) => {
  const handleSearchChange = (value) => {
    setSearch(getValue(value));
  };

  return (
    <Row gap={1} align="center" wrap>
      <Input
        placeholder={placeholder}
        value={search}
        onChange={handleSearchChange}
        className="mb-0"
        style={{ minWidth: 240 }}
      />
      <Filters
        onFilterChange={onFiltersChange}
        fields={filterFieldDefs}
        initial={initialFilters}
      />
    </Row>
  );
};

export default CampaignFilterBar;
