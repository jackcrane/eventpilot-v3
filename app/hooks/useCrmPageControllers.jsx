import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOffcanvas } from "tabler-react-2";
import { useCrm } from "./useCrm";
import { useCrmFields } from "./useCrmFields";
import { useCrmSavedSegments } from "./useCrmSavedSegments";
import { useCrmSegment } from "./useCrmSegment";
import { useCrmStoredFilters } from "./useCrmStoredFilters";
import { useCrmManualFilters } from "./useCrmManualFilters";
import { useCrmColumnConfig } from "./useCrmColumnConfig";
import { useCrmAiState } from "./useCrmAiState";

export const useCrmPageControllers = ({ eventId }) => {
  const navigate = useNavigate();
  const crm = useCrm({ eventId });
  const offcanvasState = useOffcanvas({
    offcanvasProps: { position: "end", size: 500, zIndex: 1051 },
  });
  const fieldsModal = useCrmFields({ eventId });
  const { savedSegments } = useCrmSavedSegments({ eventId });
  const segmentRunner = useCrmSegment({ eventId });
  const [storedFilters, setStoredFilters] = useCrmStoredFilters();

  const manual = useCrmManualFilters({
    crmFields: crm.crmFields,
    storedFilters,
    setStoredFilters,
  });

  const columnConfig = useCrmColumnConfig({
    crmFields: crm.crmFields,
    onViewPerson: (id) => navigate(`/events/${eventId}/crm/${id}`),
  });

  const ai = useCrmAiState({
    eventId,
    storedFilters,
    setStoredFilters,
    savedSegments,
    runSavedSegment: segmentRunner.run,
    offcanvas: offcanvasState.offcanvas,
    close: offcanvasState.close,
  });

  const [aiCollapsed, setAiCollapsed] = useState(false);

  return {
    crm,
    offcanvasState,
    fieldsModal,
    storedFilters,
    manual,
    columnConfig,
    ai,
    aiCollapsed,
    toggleAiCollapsed: () => setAiCollapsed((prev) => !prev),
  };
};
