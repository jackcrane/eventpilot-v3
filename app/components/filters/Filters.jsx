// Filters.jsx
import { useState, useEffect } from "react";
import { Input, Button, DropdownInput } from "tabler-react-2";
import { Icon } from "../../util/Icon";
import { Row } from "../../util/Flex";
import styles from "./filters.module.css";
import classNames from "classnames";

const DEFAULT_FIELD_DEFINITIONS = [
  {
    label: "source",
    hrTitle: "Acquisition Source",
    type: "enum",
    options: [
      "MANUAL",
      "IMPORT",
      "VOLUNTEER",
      "REGISTRATION",
      "SENT_EMAIL",
      "EMAIL",
    ],
    defaultOperation: "eq",
  },
  {
    label: "createdAt",
    hrTitle: "Created Date",
    type: "date",
    defaultOperation: "date-after",
  },
  {
    label: "name",
    hrTitle: "Name",
    type: "text",
    defaultOperation: "contains",
  },
];

const OPERATORS = [
  {
    id: "eq",
    label: "Is",
    supports: ["enum", "boolean", "number", "text", "date"],
    icon: <Icon i="equal" />,
  },
  {
    id: "exists",
    label: "Exists",
    supports: ["enum", "boolean", "number", "text", "date"],
    icon: <Icon i="check" />,
    noValue: true,
  },
  {
    id: "not-exists",
    label: "Does Not Exist",
    supports: ["enum", "boolean", "number", "text", "date"],
    icon: <Icon i="x" />,
    noValue: true,
  },
  {
    id: "neq",
    label: "Is Not",
    supports: ["enum", "boolean", "number", "text", "date"],
    icon: <Icon i="equal-not" />,
  },
  {
    id: "contains",
    label: "Contains",
    supports: ["text"],
    icon: <Icon i="brackets-contain" />,
  },
  {
    id: "not-contains",
    label: "Does Not Contain",
    supports: ["text"],
    icon: <Icon i="brackets-off" />,
  },
  {
    id: "starts-with",
    label: "Starts With",
    supports: ["text"],
    icon: <Icon i="brackets-contain-start" />,
  },
  {
    id: "ends-with",
    label: "Ends With",
    supports: ["text"],
    icon: <Icon i="brackets-contain-end" />,
  },
  {
    id: "greater-than",
    label: "Greater Than",
    supports: ["number"],
    icon: <Icon i="math-greater" />,
  },
  {
    id: "greater-than-or-equal",
    label: "≥",
    supports: ["number"],
    icon: <Icon i="math-equal-greater" />,
  },
  {
    id: "less-than",
    label: "Less Than",
    supports: ["number"],
    icon: <Icon i="math-lower" />,
  },
  {
    id: "less-than-or-equal",
    label: "≤",
    supports: ["number"],
    icon: <Icon i="math-equal-lower" />,
  },
  {
    id: "date-after",
    label: "Date After",
    supports: ["date"],
    icon: <Icon i="arrow-right-bar" />,
  },
  {
    id: "date-before",
    label: "Date Before",
    supports: ["date"],
    icon: <Icon i="arrow-left-bar" />,
  },
];

export const Filters = ({ onFilterChange, fields, initial }) => {
  const [filters, setFilters] = useState([]);
  const FIELD_DEFINITIONS = fields && fields.length ? fields : DEFAULT_FIELD_DEFINITIONS;

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Hydrate from initial value once (or when definitions change if empty)
  useEffect(() => {
    if (!initial || !initial.length) return;
    if (filters.length > 0) return;
    const now = Date.now();
    const next = initial
      .map((it, i) => {
        const def = FIELD_DEFINITIONS.find((fd) => fd.label === it.label);
        if (!def) return null;
        return {
          id: now + i,
          field: def,
          operation: it.operation || def.defaultOperation,
          value: it.value ?? null,
          collapsed: false,
        };
      })
      .filter(Boolean);
    if (next.length) setFilters(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, FIELD_DEFINITIONS]);

  const usedLabels = filters.map((f) => f.field.label);

  const addFilter = ({ id }) => {
    if (usedLabels.includes(id)) return;
    const def = FIELD_DEFINITIONS.find((fd) => fd.label === id);
    if (!def) return;
    setFilters((fs) => [
      ...fs,
      {
        id: Date.now() + Math.random(),
        field: def,
        operation: def.defaultOperation,
        value: null,
        collapsed: false,
      },
    ]);
  };

  const removeFilter = (id) =>
    setFilters((fs) => fs.filter((f) => f.id !== id));
  const updateFilter = (id, changes) =>
    setFilters((fs) => fs.map((f) => (f.id === id ? { ...f, ...changes } : f)));

  return (
    <div className={styles.container}>
      <Row gap={1} wrap>
        <DropdownInput
          prompt="Add Filter"
          items={FIELD_DEFINITIONS.map((f) => ({
            id: f.label,
            label: f.hrTitle,
            disabled: usedLabels.includes(f.label),
          }))}
          onChange={addFilter}
          style={{ alignSelf: "stretch" }}
          aprops={{
            style: { height: "100%", borderRadius: 8, boxShadow: "none" },
          }}
        />

        {filters.map((filter) => (
          <Filter
            key={filter.id}
            filter={filter}
            fieldOptions={FIELD_DEFINITIONS}
            usedLabels={usedLabels}
            onChange={(changes) => updateFilter(filter.id, changes)}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}
      </Row>
    </div>
  );
};

export const Filter = ({
  filter: { field, operation, value, collapsed },
  fieldOptions,
  usedLabels,
  onChange,
  onRemove,
}) => {
  const ops = OPERATORS.filter((op) => op.supports.includes(field.type));

  const getInputComponent = () => {
    switch (field.type) {
      case "enum":
      case "boolean":
        return (
          <DropdownInput
            className="p-1"
            prompt="Pick"
            items={field.options.map((opt) => ({ id: opt, label: opt }))}
            value={value}
            onChange={(v) => onChange({ value: v.id })}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            className="mb-0"
            inputClassName="p-1"
            value={value || ""}
            onChange={(e) => onChange({ value: e })}
          />
        );
      default:
        return (
          <Input
            type={field.type === "number" ? "number" : "text"}
            placeholder="Query"
            className="mb-0"
            inputClassName="p-1"
            value={value || ""}
            onChange={(e) => onChange({ value: e })}
          />
        );
    }
  };

  return (
    <Row gap={1}>
      <div className="card p-0 px-1">
        <Row gap={0} align="center">
          <DropdownInput
            className="p-1"
            prompt={field.hrTitle}
            items={fieldOptions.map((fd) => ({
              id: fd.label,
              label: fd.hrTitle,
              disabled:
                usedLabels.includes(fd.label) && fd.label !== field.label,
            }))}
            value={field.label}
            onChange={({ id }) => {
              const newField = fieldOptions.find((fd) => fd.label === id);
              onChange({
                field: newField,
                operation: newField.defaultOperation,
                value: null,
              });
            }}
          />

          <div
            className={classNames(styles.animatedContainer, {
              [styles.collapsed]: collapsed,
              [styles.expanded]: !collapsed,
            })}
          >
            <DropdownInput
              className="p-1"
              prompt="Operation"
              items={ops.map((o) => ({
                id: o.id,
                label: o.label,
                icon: o.icon,
                noValue: o.noValue,
              }))}
              value={operation}
              onChange={(op) =>
                onChange({ operation: op.id, ...(op.noValue ? { value: null } : {}) })
              }
              showIconInPrompt
              autofocusSearch
            />
            {!ops.find((o) => o.id === operation)?.noValue && getInputComponent()}
          </div>

          <div className="p-1">
            <Button
              className="p-1"
              ghost
              variant="secondary"
              onClick={() => onChange({ collapsed: !collapsed })}
            >
              <Icon i={collapsed ? "chevron-right" : "chevron-left"} />
            </Button>
            <Button className="p-1" ghost variant="danger" onClick={onRemove}>
              <Icon i="trash" />
            </Button>
          </div>
        </Row>
      </div>
    </Row>
  );
};
