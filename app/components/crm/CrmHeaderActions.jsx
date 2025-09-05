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
}) => {
  return (
    <Row gap={1} justify="flex-end" className="mb-3">
      <ColumnsPicker columns={columnConfig} onColumnsChange={setColumnConfig} />
      <Dropdown
        prompt="Create/Import Contacts"
        items={[
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
        ]}
      />
      <Button onClick={createCrmFieldModal} loading={mutationLoading}>
        Create a Field
      </Button>
    </Row>
  );
};

