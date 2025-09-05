import React from "react";
import { Table } from "tabler-react-2";

export const CrmPersonsTable = ({ data = [], columns = [] }) => {
  if (!data || data.length === 0) return null;
  return (
    <Table
      className="card"
      showPagination={(data || []).length > 10}
      columns={columns}
      data={data}
    />
  );
};

