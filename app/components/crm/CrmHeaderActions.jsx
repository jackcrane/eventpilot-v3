import React from "react";
import { Row } from "../../util/Flex";
import { ColumnsPicker } from "../columnsPicker/ColumnsPicker";
import { Dropdown, Button } from "tabler-react-2";
import { CrmPersonCRUD } from "../crmPersonCRUD/crmPersonCRUD";
import { CrmPersonsImport } from "../crmPersonsImport/CrmPersonsImport";

export const CrmHeaderActions = ({
  columnConfig,
  setColumnConfig,
  offcanvas,
  createCrmFieldModal,
  mutationLoading,
  CreateCrmFieldModalElement,
  onDownloadCsv,
  downloadingCsv,
}) => {
  return (
    <Row gap={1} justify="flex-end" className="mb-3">
      <ColumnsPicker columns={columnConfig} onColumnsChange={setColumnConfig} />
      <Dropdown
        prompt="Actions"
        items={[
          {
            text: downloadingCsv ? "Preparing CSV..." : "Download CSV",
            onclick: () => {
              if (!downloadingCsv && typeof onDownloadCsv === "function") {
                onDownloadCsv();
              }
            },
          },
          {
            type: "divider",
          },
          {
            text: "Create a Contact",
            onclick: () => offcanvas({ content: <CrmPersonCRUD /> }),
          },
          {
            text: "Import Contacts from CSV",
            onclick: () =>
              offcanvas({
                content: (
                  <CrmPersonsImport
                    createCrmFieldModal={createCrmFieldModal}
                    CreateCrmFieldModalElement={CreateCrmFieldModalElement}
                  />
                ),
              }),
          },
          {
            type: "divider",
          },
          {
            text: "Create a field",
            onclick: createCrmFieldModal,
          },
        ]}
      />
    </Row>
  );
};
