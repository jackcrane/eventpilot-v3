import React, { useState } from "react";
import { Typography, Input, DropdownInput, Button } from "tabler-react-2";
import { useCrm } from "../../hooks/useCrm";
import { useParams } from "react-router-dom";
import { Loading } from "../loading/Loading";
import { Row } from "../../util/Flex";
import styles from "./crmPersonsImport.module.css";
import { Icon } from "../../util/Icon";
import toast from "react-hot-toast";
import { useCrmPersons } from "../../hooks/useCrmPersons";
import { useCrmFields } from "../../hooks/useCrmFields";

export const mapCsvToPersons = (csvData, headerMap) =>
  csvData.map((row) => {
    const person = {
      name: "",
      fields: [],
      emails: [],
      phones: [],
    };

    Object.entries(headerMap).forEach(([header, mappedId]) => {
      const rawValue = (row[header] || "").trim();
      if (!rawValue || mappedId === "dont-import") return;

      switch (mappedId) {
        case "name":
          person.name = rawValue;
          break;

        case "email":
          person.emails.push({ email: rawValue });
          break;

        case "phone":
          person.phones.push({ phone: rawValue });
          break;

        default:
          // custom field
          person.fields.push({ id: mappedId, value: rawValue });
      }
    });

    return person;
  });

export const validateHeaderMap = (headerMap) => {
  const counts = Object.values(headerMap).reduce((acc, id) => {
    if (id === "dont-import") return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  const errors = [];

  // Name is required and must be exactly one
  if (!counts["name"]) {
    // errors.push("Name must be mapped exactly once.");
    toast.error("You must pick a column for the Name field.");
  } else if (counts["name"] > 1) {
    toast.error("You mapped multiple columns for the Name field.");
  }

  // All other fields (except email & phone) may not repeat
  Object.entries(counts).forEach(([id, count]) => {
    if (id !== "name" && id !== "email" && id !== "phone" && count > 1) {
      toast.error(`You mapped multiple columns for a field.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const parseCsv = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const csv = reader.result;
      const [headerLine, ...rawRows] = csv.split("\n");
      const rows = rawRows.filter((row) => row.trim() !== "");
      const headers = headerLine.split(",");
      const data = rows.map((row) =>
        row.split(",").reduce((acc, val, idx) => {
          acc[headers[idx]] = val;
          return acc;
        }, {})
      );
      resolve([data, headers]);
    };
    reader.readAsText(file);
  });

export const CrmPersonsImport = ({
  createCrmFieldModal,
  CreateCrmFieldModalElement,
}) => {
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [headerMap, setHeaderMap] = useState({});
  const { eventId } = useParams();
  const { crmFields, loading: fieldsLoading } = useCrm({ eventId });
  const { batchCreateCrmPersons, mutationLoading } = useCrmPersons({ eventId });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    const [data, headers] = await parseCsv(file);
    setCsvData(data);
    setCsvHeaders(headers);
  };

  const [creatingNewField, setCreatingNewField] = useState(null);
  const handleMappingChange = async (header, _id) => {
    let id = _id;
    if (id === "EVENTPILOT__INTERNAL_TRIGGER_CREATE_NEW_FIELD") {
      setCreatingNewField(header);
      const data = await createCrmFieldModal();
      if (!data.crmField) toast.error("Error creating field");
      id = data?.crmField?.id;
      setCreatingNewField(null);
    }

    setHeaderMap((prev) => {
      const newMap = { ...prev, [header]: id };
      const counts = Object.values(newMap).reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
      if (
        counts[id] > 1 &&
        id !== "email" &&
        id !== "phone" &&
        id !== "dont-import"
      ) {
        toast.error(`Field "${id}" cannot be mapped multiple times.`);
      }
      return newMap;
    });
  };

  const handleSubmit = async () => {
    const { valid, errors } = validateHeaderMap(headerMap);
    if (!valid) {
      return;
    }

    const persons = mapCsvToPersons(csvData, headerMap);
    if (await batchCreateCrmPersons(persons)) {
      toast.success("Imported successfully");
    }
  };

  if (fieldsLoading) return <Loading />;

  return (
    <div style={{ marginBottom: 100 }}>
      {CreateCrmFieldModalElement}
      <Typography.H5 className="mb-0 text-secondary">CONTACTS</Typography.H5>
      <Typography.H1>Import Contacts from CSV</Typography.H1>
      <Typography.Text>
        EventPilot allows you to import contacts from a CSV file. This is useful
        if you have a list of contacts that you want to add to EventPilot. Your
        CSV file will not leave your computer. We will select only the data we
        need from the CSV and upload that.
      </Typography.Text>
      <Input
        label="CSV File"
        placeholder="Select a CSV file"
        required
        type="file"
        inputProps={{ accept: ".csv", onChange: handleFileChange }}
      />

      {csvHeaders.length > 0 && (
        <>
          <Typography.H2 className="mt-2">Map Properties</Typography.H2>
          <Typography.Text>
            Ensure columns from your CSV file are mapped correctly to the
            columns EventPilot is expecting. If you don't want to import a
            column, just leave it as "Don't import"
          </Typography.Text>
          <Typography.Text>
            Most properties will only allow you to select one column, except for
            phone and email, which can be mapped to multiple columns.
          </Typography.Text>
          {csvHeaders.map((header) => (
            <Row key={header} gap={1} align="center" className="mb-1">
              <div className={styles.headerName}>{header}</div>
              <Icon i="arrow-right" />
              <DropdownInput
                loading={creatingNewField === header}
                prompt={
                  creatingNewField === header ? "Creating…" : "Select a field"
                }
                className={styles.headerMap}
                aprops={{
                  style: { width: "100%", justifyContent: "space-between" },
                }}
                value={headerMap[header] || "dont-import"}
                onChange={({ id }) => handleMappingChange(header, id)}
                items={[
                  {
                    id: "dont-import",
                    label: "Don't import",
                  },
                  {
                    label: "Create a new custom field",
                    id: "EVENTPILOT__INTERNAL_TRIGGER_CREATE_NEW_FIELD",
                  },
                  { type: "divider" },
                  { type: "header", text: "Default Fields" },
                  {
                    id: "name",
                    label: "Name",
                    disabled: Object.values(headerMap).includes("name"),
                  },
                  { id: "email", label: "Email" },
                  { id: "phone", label: "Phone" },
                  { type: "divider" },
                  { type: "header", text: "Custom Fields" },
                  ...crmFields.map((f) => ({
                    id: f.id,
                    label: f.label,
                    disabled: Object.values(headerMap).includes(f.id),
                  })),
                ]}
              />
            </Row>
          ))}
          <Row justify="flex-end">
            <Button onClick={handleSubmit} className={"mt-3"}>
              Import {csvData.length} contacts
            </Button>
          </Row>
        </>
      )}
    </div>
  );
};
