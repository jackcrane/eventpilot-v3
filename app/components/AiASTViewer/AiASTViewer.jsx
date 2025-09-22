import React, { useMemo, useState } from "react";

/**
 * Small, self-contained AST editor for EventPilot CRM Segments.
 * - Single component, named export, ES modules, arrow functions.
 * - Reads (paste JSON) and writes (console.log) ASTs.
 * - Compact UI; no external libs.
 */

const EMPTY_INVOLVEMENT = {
  type: "involvement",
  role: "participant",
  iteration: { type: "current" },
  exists: true,
};

const EMPTY_GROUP = { type: "group", op: "and", conditions: [] };

const EMPTY_TRANSITION = {
  type: "transition",
  from: { ...EMPTY_INVOLVEMENT },
  to: { ...EMPTY_INVOLVEMENT, role: "volunteer" },
};

const EMPTY_UPSELL = {
  type: "upsell",
  iteration: { type: "current" },
  exists: true,
};

const EMPTY_EMAIL = {
  type: "email",
  direction: "outbound",
  withinDays: 21,
  exists: true,
};

const TYPE_OPTIONS = ["group", "involvement", "transition", "upsell", "email"];

const ITER_TYPES = ["current", "previous", "specific", "year", "name"];

export const CrmSegmentAstEditor = ({
  initialAst = { filter: EMPTY_GROUP },
  onAstChange,
}) => {
  const [ast, setAst] = useState(() => sanitizeRoot(initialAst));
  const [importText, setImportText] = useState(JSON.stringify(ast, null, 2));
  const [showImport, setShowImport] = useState(false);
  const setAndNotify = (next) => {
    setAst(next);
    onAstChange?.(next);
  };

  const updateFilter = (updater) => {
    const next = { ...ast, filter: updater(ast.filter) };
    setAndNotify(next);
  };

  const exportAst = () => {
    // Writing
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(ast, null, 2));
    alert("AST logged to console.");
  };

  const tryImport = () => {
    try {
      const obj = JSON.parse(importText);
      const cleaned = sanitizeRoot(obj);
      setAndNotify(cleaned);
      setShowImport(false);
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <strong>CRM Segment AST</strong>
        <div style={styles.rowGap}>
          <button style={styles.btn} onClick={() => setShowImport((s) => !s)}>
            {showImport ? "Close" : "Import JSON"}
          </button>
          <button style={styles.btnPrimary} onClick={exportAst}>
            Log AST
          </button>
        </div>
      </div>

      {showImport && (
        <div style={styles.card}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            style={{ ...styles.textarea, width: "100%" }}
            spellCheck={false}
          />
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button style={styles.btn} onClick={tryImport}>
              Load
            </button>
            <button
              style={styles.btn}
              onClick={() => setImportText(JSON.stringify(ast, null, 2))}
            >
              Use Current
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <label style={styles.label}>Root Type</label>
        <TypeSwitcher
          node={ast.filter}
          onTypeChange={(newType) =>
            updateFilter((cur) => coerceNodeType(cur, newType))
          }
        />
        <NodeEditor
          node={ast.filter}
          onChange={(nextNode) => updateFilter(() => nextNode)}
        />
      </div>
    </div>
  );
};

/** ------------------------------ Node Editors ------------------------------ */

const NodeEditor = ({ node, onChange }) => {
  switch (node.type) {
    case "group":
      return <GroupEditor node={node} onChange={onChange} />;
    case "involvement":
      return <InvolvementEditor node={node} onChange={onChange} />;
    case "transition":
      return <TransitionEditor node={node} onChange={onChange} />;
    case "upsell":
      return <UpsellEditor node={node} onChange={onChange} />;
    case "email":
      return <EmailEditor node={node} onChange={onChange} />;
    default:
      return <div style={styles.warn}>Unknown node type.</div>;
  }
};

const GroupEditor = ({ node, onChange }) => {
  const set = (patch) => onChange({ ...node, ...patch });

  const addChild = (type = "involvement") => {
    const newChild = coerceNodeType({}, type);
    set({ conditions: [...(node.conditions || []), newChild] });
  };

  const updateChild = (idx, updater) => {
    const copy = [...(node.conditions || [])];
    copy[idx] = updater(copy[idx]);
    set({ conditions: copy });
  };

  const removeChild = (idx) => {
    const copy = [...(node.conditions || [])];
    copy.splice(idx, 1);
    set({ conditions: copy });
  };

  return (
    <div style={styles.stack}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>Operator</label>
          <select
            value={node.op || "and"}
            onChange={(e) => set({ op: e.target.value })}
            style={styles.input}
          >
            <option value="and">and</option>
            <option value="or">or</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={!!node.not}
              onChange={(e) => set({ not: e.target.checked || undefined })}
            />
            <span style={{ marginLeft: 6 }}>NOT group</span>
          </label>
        </div>
      </div>

      <div style={{ ...styles.stack, gap: 8 }}>
        {(node.conditions || []).map((c, i) => (
          <div key={i} style={styles.childCard}>
            <div style={styles.childHeader}>
              <TypeSwitcher
                node={c}
                onTypeChange={(newType) =>
                  updateChild(i, (cur) => coerceNodeType(cur, newType))
                }
              />
              <div style={styles.rowGap}>
                <button
                  style={styles.btn}
                  onClick={() =>
                    updateChild(i, (cur) => ({ ...cur, __fold: !cur.__fold }))
                  }
                >
                  {c.__fold ? "Expand" : "Collapse"}
                </button>
                <button style={styles.btnDanger} onClick={() => removeChild(i)}>
                  Remove
                </button>
              </div>
            </div>
            {!c.__fold && (
              <NodeEditor
                node={c}
                onChange={(next) => updateChild(i, () => next)}
              />
            )}
          </div>
        ))}
      </div>

      <div style={styles.rowGap}>
        <button style={styles.btn} onClick={() => addChild("involvement")}>
          + Involvement
        </button>
        <button style={styles.btn} onClick={() => addChild("group")}>
          + Group
        </button>
        <button style={styles.btn} onClick={() => addChild("transition")}>
          + Transition
        </button>
        <button style={styles.btn} onClick={() => addChild("upsell")}>
          + Upsell
        </button>
        <button style={styles.btn} onClick={() => addChild("email")}>
          + Email
        </button>
      </div>
    </div>
  );
};

const InvolvementEditor = ({ node, onChange }) => {
  const set = (patch) => onChange({ ...node, ...patch });

  const ensureParticipant = () =>
    set({
      role: "participant",
      participant: node.participant || {},
      volunteer: undefined,
    });

  const ensureVolunteer = () =>
    set({
      role: "volunteer",
      volunteer: node.volunteer || {},
      participant: undefined,
    });

  return (
    <div style={styles.stack}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>Role</label>
          <select
            value={node.role || "participant"}
            onChange={(e) =>
              e.target.value === "participant"
                ? ensureParticipant()
                : ensureVolunteer()
            }
            style={styles.input}
          >
            <option value="participant">participant</option>
            <option value="volunteer">volunteer</option>
          </select>
        </div>

        <div>
          <label style={styles.label}>Exists</label>
          <select
            value={String(node.exists ?? true)}
            onChange={(e) => set({ exists: e.target.value === "true" })}
            style={styles.input}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      </div>

      <div>
        <label style={styles.label}>Iteration</label>
        <IterationEditor
          iter={node.iteration || { type: "current" }}
          onChange={(iteration) => set({ iteration })}
        />
      </div>

      {node.role === "participant" && (
        <div style={styles.grid2}>
          <TextField
            label="tierName"
            value={node.participant?.tierName || ""}
            onChange={(v) =>
              set({
                participant: cleanEmpty({
                  ...(node.participant || {}),
                  tierName: v,
                }),
              })
            }
          />
          <TextField
            label="tierId"
            value={node.participant?.tierId || ""}
            onChange={(v) =>
              set({
                participant: cleanEmpty({
                  ...(node.participant || {}),
                  tierId: v,
                }),
              })
            }
          />
          <TextField
            label="periodName"
            value={node.participant?.periodName || ""}
            onChange={(v) =>
              set({
                participant: cleanEmpty({
                  ...(node.participant || {}),
                  periodName: v,
                }),
              })
            }
          />
          <TextField
            label="periodId"
            value={node.participant?.periodId || ""}
            onChange={(v) =>
              set({
                participant: cleanEmpty({
                  ...(node.participant || {}),
                  periodId: v,
                }),
              })
            }
          />
        </div>
      )}

      {node.role === "volunteer" && (
        <div style={styles.grid2}>
          <NumberField
            label="minShifts"
            value={node.volunteer?.minShifts ?? ""}
            onChange={(v) =>
              set({
                volunteer: cleanEmpty({
                  ...(node.volunteer || {}),
                  minShifts: v === "" ? undefined : Number(v),
                }),
              })
            }
            min={0}
          />
        </div>
      )}
    </div>
  );
};

const TransitionEditor = ({ node, onChange }) => {
  const set = (patch) => onChange({ ...node, ...patch });
  const forceExists = (n) =>
    n?.type === "involvement" ? { ...n, exists: true } : n;

  return (
    <div style={styles.stack}>
      <div style={styles.subtle}>
        Transition: people who satisfy both “from” and “to”.
      </div>
      <div style={styles.childCard}>
        <div style={styles.childHeader}>
          <strong>From</strong>
          <TypeSwitcher
            node={node.from}
            onTypeChange={(newType) =>
              set({ from: forceExists(coerceNodeType(node.from, newType)) })
            }
            limitTo={["involvement"]}
          />
        </div>
        <NodeEditor
          node={node.from}
          onChange={(next) => set({ from: forceExists(next) })}
        />
      </div>

      <div style={styles.childCard}>
        <div style={styles.childHeader}>
          <strong>To</strong>
          <TypeSwitcher
            node={node.to}
            onTypeChange={(newType) =>
              set({ to: forceExists(coerceNodeType(node.to, newType)) })
            }
            limitTo={["involvement"]}
          />
        </div>
        <NodeEditor
          node={node.to}
          onChange={(next) => set({ to: forceExists(next) })}
        />
      </div>
    </div>
  );
};

const UpsellEditor = ({ node, onChange }) => {
  const set = (patch) => onChange({ ...node, ...patch });
  return (
    <div style={styles.stack}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>Exists</label>
          <select
            value={String(node.exists ?? true)}
            onChange={(e) => set({ exists: e.target.value === "true" })}
            style={styles.input}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      </div>

      <div>
        <label style={styles.label}>Iteration</label>
        <IterationEditor
          iter={node.iteration || { type: "current" }}
          onChange={(iteration) => set({ iteration })}
        />
      </div>

      <div style={styles.grid2}>
        <TextField
          label="upsellItemName"
          value={node.upsellItemName || ""}
          onChange={(v) => set({ upsellItemName: v || undefined })}
        />
        <TextField
          label="upsellItemId"
          value={node.upsellItemId || ""}
          onChange={(v) => set({ upsellItemId: v || undefined })}
        />
      </div>
    </div>
  );
};

const EmailEditor = ({ node, onChange }) => {
  const set = (patch) => onChange({ ...node, ...patch });
  return (
    <div style={styles.stack}>
      <div style={styles.grid2}>
        <div>
          <label style={styles.label}>Direction</label>
          <select
            value={node.direction || "outbound"}
            onChange={(e) => set({ direction: e.target.value })}
            style={styles.input}
          >
            <option value="outbound">outbound</option>
            <option value="inbound">inbound</option>
            <option value="either">either</option>
          </select>
        </div>
        <NumberField
          label="withinDays"
          value={node.withinDays ?? 21}
          onChange={(v) => set({ withinDays: Number(v) || 0 })}
          min={0}
          required
        />
      </div>

      <div>
        <label style={styles.label}>Exists</label>
        <select
          value={String(node.exists ?? true)}
          onChange={(e) => set({ exists: e.target.value === "true" })}
          style={styles.input}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </div>
    </div>
  );
};

/** ------------------------------ Shared UI ------------------------------ */

const TypeSwitcher = ({ node, onTypeChange, limitTo }) => {
  const options = useMemo(
    () => (limitTo && limitTo.length ? limitTo : TYPE_OPTIONS),
    [limitTo]
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <label style={styles.label} title="Node type">
        type
      </label>
      <select
        value={node?.type || options[0]}
        onChange={(e) => onTypeChange(e.target.value)}
        style={styles.input}
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
};

const IterationEditor = ({ iter, onChange }) => {
  const set = (patch) =>
    onChange({ ...(iter || { type: "current" }), ...patch });

  const onType = (t) => {
    const base = { type: t };
    if (t === "specific") set(base); // expects instanceId
    else if (t === "year") set(base); // expects year
    else if (t === "name") set(base); // expects name
    else set(base); // current / previous
  };

  return (
    <div style={styles.childCard}>
      <div style={styles.row}>
        <div>
          <label style={styles.label}>iteration.type</label>
          <select
            value={iter?.type || "current"}
            onChange={(e) => onType(e.target.value)}
            style={styles.input}
          >
            {ITER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {iter?.type === "specific" && (
          <TextField
            label="instanceId"
            value={iter.instanceId || ""}
            onChange={(v) => set({ instanceId: v || undefined })}
          />
        )}
        {iter?.type === "year" && (
          <NumberField
            label="year"
            value={iter.year ?? ""}
            onChange={(v) => set({ year: v === "" ? undefined : Number(v) })}
            min={1970}
          />
        )}
        {iter?.type === "name" && (
          <TextField
            label="name"
            value={iter.name || ""}
            onChange={(v) => set({ name: v || undefined })}
          />
        )}
      </div>
    </div>
  );
};

const TextField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={styles.label}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
      style={styles.input}
    />
  </div>
);

const NumberField = ({ label, value, onChange, min, max, required }) => (
  <div>
    <label style={styles.label}>{label}</label>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      style={styles.input}
    />
  </div>
);

/** ------------------------------ Utilities ------------------------------ */

const coerceNodeType = (node = {}, type) => {
  if (type === node?.type) return { ...node };
  switch (type) {
    case "group":
      return { ...EMPTY_GROUP };
    case "involvement":
      return { ...EMPTY_INVOLVEMENT };
    case "transition":
      return { ...EMPTY_TRANSITION };
    case "upsell":
      return { ...EMPTY_UPSELL };
    case "email":
      return { ...EMPTY_EMAIL };
    default:
      return { ...EMPTY_GROUP };
  }
};

const sanitizeRoot = (obj) => {
  // Accept {filter} or raw node; always return {filter}
  if (!obj || typeof obj !== "object") return { filter: EMPTY_GROUP };
  if (obj.filter && typeof obj.filter === "object") {
    return { filter: sanitizeNode(obj.filter) };
  }
  return { filter: sanitizeNode(obj) };
};

const sanitizeNode = (node) => {
  if (!node || typeof node !== "object") return { ...EMPTY_GROUP };
  const t = node.type;
  switch (t) {
    case "group":
      return {
        type: "group",
        op: node.op === "or" ? "or" : "and",
        not: node.not ? true : undefined,
        conditions: Array.isArray(node.conditions)
          ? node.conditions.map(sanitizeNode)
          : [],
      };
    case "involvement": {
      const role = node.role === "volunteer" ? "volunteer" : "participant";
      const exists = node.exists === false ? false : true;
      const base = {
        type: "involvement",
        role,
        iteration: sanitizeIter(node.iteration),
        exists,
      };
      if (role === "participant") {
        const p = node.participant || {};
        base.participant = cleanEmpty({
          tierId: p.tierId,
          tierName: p.tierName,
          periodId: p.periodId,
          periodName: p.periodName,
        });
      } else {
        const v = node.volunteer || {};
        base.volunteer = cleanEmpty({
          minShifts: typeof v.minShifts === "number" ? v.minShifts : undefined,
        });
      }
      return base;
    }
    case "transition":
      return {
        type: "transition",
        from: forceInvolvementExistsTrue(sanitizeNode(node.from)),
        to: forceInvolvementExistsTrue(sanitizeNode(node.to)),
      };
    case "upsell":
      return {
        type: "upsell",
        iteration: sanitizeIter(node.iteration),
        exists: node.exists === false ? false : true,
        upsellItemId: emptyToUndef(node.upsellItemId),
        upsellItemName: emptyToUndef(node.upsellItemName),
      };
    case "email":
      return {
        type: "email",
        direction:
          node.direction === "inbound"
            ? "inbound"
            : node.direction === "either"
            ? "either"
            : "outbound",
        withinDays: typeof node.withinDays === "number" ? node.withinDays : 21,
        exists: node.exists === false ? false : true,
      };
    default:
      return { ...EMPTY_GROUP };
  }
};

const sanitizeIter = (iter) => {
  const t = iter?.type;
  if (t === "previous" || t === "current") return { type: t };
  if (t === "specific")
    return cleanEmpty({
      type: "specific",
      instanceId: emptyToUndef(iter.instanceId),
    });
  if (t === "year")
    return cleanEmpty({
      type: "year",
      year: typeof iter.year === "number" ? iter.year : undefined,
    });
  if (t === "name")
    return cleanEmpty({ type: "name", name: emptyToUndef(iter.name) });
  return { type: "current" };
};

const emptyToUndef = (v) => (v === "" || v === null ? undefined : v);
const cleanEmpty = (obj) => {
  const out = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === "" || out[k] === null || typeof out[k] === "undefined") {
      delete out[k];
    }
  });
  return Object.keys(out).length ? out : undefined;
};

const forceInvolvementExistsTrue = (n) => {
  if (n?.type === "involvement") return { ...n, exists: true };
  // If not involvement (unexpected), coerce to default involvement
  return { ...EMPTY_INVOLVEMENT };
};

/** ------------------------------ Tiny Styles ------------------------------ */

const styles = {
  shell: {
    maxWidth: 760,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif',
    fontSize: 13,
    lineHeight: 1.4,
    color: "#1f2937",
    display: "grid",
    gap: 10,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fafafa",
  },
  card: {
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "white",
  },
  childCard: {
    padding: 10,
    border: "1px dashed #e5e7eb",
    borderRadius: 8,
    background: "#fcfcfc",
  },
  childHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: { display: "block", fontSize: 11, color: "#6b7280", marginBottom: 4 },
  input: {
    fontSize: 13,
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    minWidth: 140,
  },
  textarea: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    padding: 8,
    border: "1px solid #d1d5db",
    borderRadius: 6,
  },
  btn: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
  },
  btnPrimary: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #0ea5e9",
    borderRadius: 6,
    background: "#0ea5e9",
    color: "#fff",
    cursor: "pointer",
  },
  btnDanger: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #ef4444",
    borderRadius: 6,
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
  row: { display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  rowGap: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  stack: { display: "grid", gap: 10 },
  checkbox: { display: "flex", alignItems: "center", userSelect: "none" },
  subtle: { color: "#6b7280", fontSize: 12 },
  warn: {
    color: "#b45309",
    background: "#fffbeb",
    padding: 8,
    borderRadius: 6,
  },
};
