export const COLUMN_ORDER = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
];

const items = [
  { id: "t1", title: "Design initial layout", status: "not_started" },
  { id: "t2", title: "Wire mock API", status: "in_progress" },
  { id: "t3", title: "Hook up SWR", status: "completed" },
  { id: "t4", title: "Collect feedback", status: "cancelled" },
  { id: "t5", title: "Polish drag interactions", status: "in_progress" },
];

const byStatus = (s) => items.filter((i) => i.status === s);

export const initialColumns = {
  not_started: { id: "not_started", title: "Not Started", items: byStatus("not_started") },
  in_progress: { id: "in_progress", title: "In Progress", items: byStatus("in_progress") },
  completed: { id: "completed", title: "Completed", items: byStatus("completed") },
  cancelled: { id: "cancelled", title: "Cancelled", items: byStatus("cancelled") },
};

