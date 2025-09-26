import { useEffect, useMemo, useState } from "react";
import {
  createBaseColumns,
  buildDynamicColumn,
  buildParticipantFieldColumn,
  buildVolunteerFieldColumn,
  participantFieldColumnId,
  volunteerFieldColumnId,
} from "../util/crm/createColumns";

const PARTICIPANT_PREFIX = "participant-field-";
const VOLUNTEER_PREFIX = "volunteer-field-";

const reindexColumns = (columns) =>
  columns.map((column, index) => ({ ...column, order: index + 1 }));

export const useCrmColumnConfig = ({
  crmFields = [],
  onViewPerson,
  participantFieldLabels = [],
  volunteerFieldLabels = [],
}) => {
  const [columnConfig, setColumnConfig] = useState(
    createBaseColumns(onViewPerson)
  );

  useEffect(() => {
    if (!crmFields?.length) return;
    setColumnConfig((current) => {
      if (current.some((column) => column.id.startsWith("field-"))) return current;
      const idx = current.findIndex((column) => column.id === "phones");
      const dynamic = crmFields.map((field) => buildDynamicColumn(field));
      return [
        ...current.slice(0, idx + 1),
        ...dynamic,
        ...current.slice(idx + 1),
      ].map((column, index) => ({ ...column, order: index + 1 }));
    });
  }, [crmFields]);

  useEffect(() => {
    setColumnConfig((current) => {
      const hasExistingParticipantColumns = current.some((column) =>
        column.id.startsWith(PARTICIPANT_PREFIX)
      );

      if (!participantFieldLabels?.length && !hasExistingParticipantColumns) {
        return current;
      }

      const allowedIds = new Set(
        (participantFieldLabels || []).map((label) =>
          participantFieldColumnId(label)
        )
      );

      let next = current.filter(
        (column) =>
          !column.id.startsWith(PARTICIPANT_PREFIX) || allowedIds.has(column.id)
      );

      participantFieldLabels.forEach((label) => {
        const id = participantFieldColumnId(label);
        if (next.some((column) => column.id === id)) return;
        const column = buildParticipantFieldColumn(label);
        next = [
          ...next,
          {
            ...column,
            show: column.show ?? false,
            order: next.length + 1,
          },
        ];
      });

      return reindexColumns(next);
    });
  }, [participantFieldLabels]);

  useEffect(() => {
    setColumnConfig((current) => {
      const hasExistingVolunteerColumns = current.some((column) =>
        column.id.startsWith(VOLUNTEER_PREFIX)
      );

      if (!volunteerFieldLabels?.length && !hasExistingVolunteerColumns) {
        return current;
      }

      const allowedIds = new Set(
        (volunteerFieldLabels || []).map((label) =>
          volunteerFieldColumnId(label)
        )
      );

      let next = current.filter(
        (column) =>
          !column.id.startsWith(VOLUNTEER_PREFIX) || allowedIds.has(column.id)
      );

      volunteerFieldLabels.forEach((label) => {
        const id = volunteerFieldColumnId(label);
        if (next.some((column) => column.id === id)) return;
        const column = buildVolunteerFieldColumn(label);
        next = [
          ...next,
          {
            ...column,
            show: column.show ?? false,
            order: next.length + 1,
          },
        ];
      });

      return reindexColumns(next);
    });
  }, [volunteerFieldLabels]);

  const visibleColumns = useMemo(
    () =>
      columnConfig
        .filter((column) => column.show)
        .sort((a, b) => a.order - b.order)
        .map(({ show, order, ...rest }) => rest),
    [columnConfig]
  );

  return { columnConfig, setColumnConfig, visibleColumns };
};
