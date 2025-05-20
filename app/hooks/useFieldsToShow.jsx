// src/context/FieldsToShowContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

// default columns
const DEFAULT = [
  "name",
  // "description",
  // "address",
  // "city",
  // "state",
  "capacity",
  "startTime",
  "endTime",
  // "restrictions",
  "shifts.length",
];

const FIELDS_KEY = "fieldsToShow";
const TABLE_KEY = "fieldsToShow_tableView";

export const FieldsToShowContext = createContext();

export const FieldsToShowProvider = ({ children }) => {
  const [fieldsToShow, setFieldsToShow] = useState(() => {
    const saved = localStorage.getItem(FIELDS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT;
  });

  const [table, setTable] = useState(() => {
    const saved = localStorage.getItem(TABLE_KEY);
    return saved ? JSON.parse(saved) : true;
  });

  // whenever fieldsToShow changes, write it out
  useEffect(() => {
    localStorage.setItem(FIELDS_KEY, JSON.stringify(fieldsToShow));
  }, [fieldsToShow]);

  // whenever view mode changes, write it out
  useEffect(() => {
    localStorage.setItem(TABLE_KEY, JSON.stringify(table));
  }, [table]);

  return (
    <FieldsToShowContext.Provider
      value={{ fieldsToShow, setFieldsToShow, table, setTable }}
    >
      {children}
    </FieldsToShowContext.Provider>
  );
};

// hook consumers will use
export const useFieldsToShow = () => {
  const ctx = useContext(FieldsToShowContext);
  if (!ctx) {
    throw new Error(
      "useFieldsToShow must be used within a FieldsToShowProvider"
    );
  }
  return ctx;
};
