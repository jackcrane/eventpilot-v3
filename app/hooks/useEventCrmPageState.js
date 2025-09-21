import { useCrmPageControllers } from "./useCrmPageControllers";
import { useCrmPageData } from "./useCrmPageData";

const DESCRIPTION =
  "This is the contacts page. It is a powerful CRM for managing your event's contacts.";

export const useEventCrmPageState = ({ eventId }) => {
  const controllers = useCrmPageControllers({ eventId });
  const data = useCrmPageData({ eventId, controllers });

  return {
    eventPage: {
      loading: data.eventPage.loading,
      docsLink: "https://docs.geteventpilot.com/docs/pages/crm/",
      description: DESCRIPTION,
    },
    OffcanvasElement: controllers.offcanvasState.OffcanvasElement,
    CreateCrmFieldModalElement:
      controllers.fieldsModal.CreateCrmFieldModalElement,
    headerProps: {
      columnConfig: controllers.columnConfig.columnConfig,
      setColumnConfig: controllers.columnConfig.setColumnConfig,
      offcanvas: controllers.offcanvasState.offcanvas,
      createCrmFieldModal: controllers.fieldsModal.createCrmFieldModal,
      mutationLoading: controllers.fieldsModal.mutationLoading,
      CreateCrmFieldModalElement:
        controllers.fieldsModal.CreateCrmFieldModalElement,
    },
    filterProps: data.filterProps,
    imports: data.imports,
    shouldShowEmpty: data.shouldShowEmpty,
    tableProps: data.tableProps,
  };
};
