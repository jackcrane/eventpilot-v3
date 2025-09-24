import React, { useEffect, useRef, useState } from "react";

/**
 * Email-blast template editor with token autocomplete on "{{".
 * - Controlled: accepts `value` (plain text with {{tokens}}) and `onChange(text)`.
 * - Emits text-only via onChange — no HTML.
 * - No default HTML content; shows a placeholder when empty.
 * - Always escape if caret is at the END of a token.
 * - Typing a full literal like "{{name}}" auto-tokenizes on input.
 * - Invalid variables are visually flagged (red hue + border + tooltip).
 */

export const VARIABLES = ["name", "email", "unsubLink", "unsubClickHere"];
const VARIABLE_MAP = {
  name: "The recipient's name",
  email: "The recipient's email address",
  unsubLink: "Unsubscribe link, looks like a url",
  unsubClickHere: 'Unsubscribe link, looks like "click here".',
};

const mapVariable = (v) => VARIABLE_MAP[v] || v;

/** Regex */
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const FIRST_VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/;

/** Caret rect */
export const getCaretRect = () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects?.() || [];
  if (rects.length) return rects[0];
  const span = document.createElement("span");
  span.appendChild(document.createTextNode("\u200b"));
  range.insertNode(span);
  const rect = span.getBoundingClientRect();
  span.parentNode && span.parentNode.removeChild(span);
  const sel2 = window.getSelection();
  sel2 && sel2.removeAllRanges();
  sel2 && sel2.addRange(range);
  return rect || null;
};

/** Base token style */
export const styleTokenBase = (token) => {
  token.style.background = "rgba(0,0,0,0.06)";
  token.style.border = "1px solid rgba(0,0,0,0.15)";
  token.style.borderRadius = "6px";
  token.style.padding = "0 4px";
  token.style.margin = "0 1px";
  token.style.fontFamily =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  token.style.whiteSpace = "pre";
  token.style.boxShadow = "none";
};

/** Invalid/valid visual state */
export const applyTokenValidity = (el, variables) => {
  const name = el.getAttribute("data-token") || "";
  const ok = Array.isArray(variables) && variables.includes(name);
  el.dataset.invalid = ok ? "false" : "true";
  if (ok) {
    styleTokenBase(el);
    el.title = "";
  } else {
    el.style.background = "rgba(220,38,38,0.08)";
    el.style.border = "1px solid rgba(220,38,38,0.55)";
    el.style.borderRadius = "6px";
    el.style.padding = "0 4px";
    el.style.margin = "0 1px";
    el.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    el.style.whiteSpace = "pre";
    el.style.boxShadow = "0 0 0 2px rgba(220,38,38,0.12) inset";
    el.title = `Unknown variable: ${name}`;
  }
};

/** Validate all tokens inside a root */
export const updateTokensValidity = (root, variables) => {
  if (!root) return;
  root.querySelectorAll("[data-token]").forEach((el) => {
    applyTokenValidity(el, variables);
  });
};

/** Token element */
export const createTokenEl = (tokenText) => {
  const token = document.createElement("span");
  token.textContent = `{{${tokenText}}}`;
  token.setAttribute("data-token", tokenText);
  token.setAttribute("contenteditable", "false");
  styleTokenBase(token);
  return token;
};

/** Active token under caret */
export const getActiveToken = () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    const el = node.closest?.("[data-token]");
    return el || null;
  }
  return null;
};

/** Caret after node */
export const setCaretAfter = (node) => {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  const parent = node.parentNode;
  if (!parent) return;
  const idx = Array.prototype.indexOf.call(parent.childNodes, node);
  r.setStart(parent, idx + 1);
  r.setEnd(parent, idx + 1);
  sel.removeAllRanges();
  sel.addRange(r);
};

/** Is caret at END of element contents? */
export const isCaretAtEndOf = (el) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const r = sel.getRangeAt(0).cloneRange();
  const full = document.createRange();
  full.selectNodeContents(el);
  return (
    r.collapsed &&
    el.contains(r.endContainer) &&
    r.compareBoundaryPoints(Range.END_TO_END, full) === 0
  );
};

/** Insert token at selection (replacing trigger) */
export const insertTokenAtSelection = (
  triggerInfo,
  tokenText,
  placeCaretInside = false
) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const token = createTokenEl(tokenText);
  const range = document.createRange();
  try {
    range.setStart(triggerInfo.node, triggerInfo.startOffset);
    range.setEnd(sel.anchorNode, sel.anchorOffset);
    range.deleteContents();
    range.insertNode(token);
    if (placeCaretInside) {
      const innerRange = document.createRange();
      innerRange.selectNodeContents(token);
      innerRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(innerRange);
    } else {
      setCaretAfter(token);
    }
  } catch {
    const r = sel.getRangeAt(0);
    r.insertNode(token);
    setCaretAfter(token);
  }
};

/** Detect "{{query" trigger */
export const detectTrigger = () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const { anchorNode, anchorOffset } = sel;
  if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) return null;
  const text = anchorNode.textContent || "";
  const upto = text.slice(0, anchorOffset);
  const start = upto.lastIndexOf("{{");
  if (start === -1) return null;
  const closing = upto.indexOf("}}", start + 2);
  if (closing !== -1) return null;
  const query = upto.slice(start + 2);
  return { node: anchorNode, startOffset: start, query };
};

/** Normalize token contents or unwrap if invalid literal */
export const normalizeTokenEl = (el) => {
  const raw = el.textContent || "";
  const m = FIRST_VAR_RE.exec(raw);
  if (m) {
    const id = m[1];
    el.textContent = `{{${id}}}`;
    el.setAttribute("data-token", id);
    return el;
  }
  const text = document.createTextNode(raw.replaceAll("\n", " "));
  el.replaceWith(text);
  return null;
};

/** Replace {{var}} text nodes with token spans (skipping existing tokens) */
export const tokenizeTextNodes = (root) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!n.nodeValue || !n.nodeValue.includes("{{"))
        return NodeFilter.FILTER_SKIP;
      if (n.parentElement && n.parentElement.closest("[data-token]"))
        return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const toProcess = [];
  let node;
  while ((node = walker.nextNode())) toProcess.push(node);
  toProcess.forEach((textNode) => {
    const parts = [];
    let lastIdx = 0;
    const text = textNode.nodeValue || "";
    let m;
    VAR_RE.lastIndex = 0;
    while ((m = VAR_RE.exec(text))) {
      const before = text.slice(lastIdx, m.index);
      if (before) parts.push(document.createTextNode(before));
      const tokenEl = createTokenEl(m[1]);
      parts.push(tokenEl);
      lastIdx = m.index + m[0].length;
    }
    const after = text.slice(lastIdx);
    if (after) parts.push(document.createTextNode(after));
    if (parts.length) {
      const frag = document.createDocumentFragment();
      parts.forEach((p) => frag.appendChild(p));
      textNode.replaceWith(frag);
    }
  });
};

/** Caret offsets (for nested-token guard) */
export const getCaretOffsetIn = (el) => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return { start: 0, end: 0 };
  const r = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(r.endContainer, r.endOffset);
  const end = pre.toString().length;
  const preStart = document.createRange();
  preStart.selectNodeContents(el);
  preStart.setEnd(r.startContainer, r.startOffset);
  const start = preStart.toString().length;
  return { start, end };
};

/** Convert editor DOM -> plain text with {{tokens}} */
export const serializeEditor = (root) => {
  if (!root) return "";
  let out = "";
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue || "";
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node;
      if (el.hasAttribute?.("data-token")) {
        const id = el.getAttribute("data-token") || "";
        out += `{{${id}}}`;
        return;
      }
      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i]);
      }
    }
  };
  for (let i = 0; i < root.childNodes.length; i++) walk(root.childNodes[i]);
  return out;
};

/** Hydrate editor DOM from controlled `value` (plain text) */
export const hydrateFromValue = (root, value) => {
  if (!root) return;
  root.innerHTML = "";
  root.appendChild(document.createTextNode(value || ""));
  tokenizeTextNodes(root);
};

/** Try to auto-tokenize when user finishes typing a literal {{name}} */
const maybeTokenizeRecentlyClosedVar = () => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const anchor = sel.anchorNode;
  if (!anchor || anchor.nodeType !== Node.TEXT_NODE) return false;
  const text = anchor.textContent || "";
  const offset = sel.anchorOffset;
  VAR_RE.lastIndex = 0;
  let m;
  while ((m = VAR_RE.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (end === offset) {
      const before = text.slice(0, start);
      const after = text.slice(end);
      const tokenEl = createTokenEl(m[1]);
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(tokenEl);
      if (after) frag.appendChild(document.createTextNode(after));
      anchor.replaceWith(frag);
      setCaretAfter(tokenEl); // caret outside (escaped)
      return true;
    }
  }
  return false;
};

/** Suggestion list */
export const SuggestionList = ({
  items,
  pos,
  activeIndex,
  onClick,
  onClose,
}) => {
  if (!pos) return null;
  return (
    <div
      data-suggestion-list
      style={{
        position: "fixed",
        left: Math.max(8, pos.left),
        top: pos.bottom + 6,
        maxHeight: 220,
        overflowY: "auto",
        minWidth: 220,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.2)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        borderRadius: 8,
        zIndex: 1000,
      }}
      role="listbox"
      aria-label="Template variables"
    >
      {items.length === 0 ? (
        <div style={{ padding: 10, color: "#666" }}>No matches</div>
      ) : (
        items.map((it, i) => (
          <div
            key={it}
            role="option"
            aria-selected={i === activeIndex}
            onMouseDown={(e) => {
              e.preventDefault();
              onClick(it);
            }}
            style={{
              padding: "8px 10px",
              cursor: "pointer",
              background: i === activeIndex ? "#f0f4ff" : "transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <code style={{ opacity: 0.8, fontSize: 12 }}>{"{{"}</code>
            <span style={{ fontFamily: "ui-sans-serif, system-ui" }}>{it}</span>
            <code style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
              {"}}"}
            </code>
          </div>
        ))
      )}
      <div
        style={{
          padding: 8,
          borderTop: "1px solid #eee",
          color: "#777",
          fontSize: 12,
        }}
      >
        ↑/↓ to navigate · Enter/Tab to insert · Esc to close
      </div>
    </div>
  );
};

SuggestionList.defaultProps = {
  items: [],
  pos: null,
  activeIndex: 0,
  onClick: () => {},
  onClose: () => {},
};

export const EmailTemplateEditor = ({
  /** Controlled props */
  value, // plain text with {{tokens}}
  onChange, // (text) => void
  /** Config */
  variables = VARIABLES,
  placeholder = "Type your email here…  Use {{double braces}} to insert variables, e.g., {{name}}",
  /** Back-compat: if value is undefined, optional one-time HTML seed (uncontrolled fallback) */
  initialHtml = "",
}) => {
  const editorRef = useRef(null);
  const syncingRef = useRef(false); // prevent loops when hydrating from value

  const [menuPos, setMenuPos] = useState(null);
  const [active, setActive] = useState(0);
  const [trigger, setTrigger] = useState(null);
  const [filtered, setFiltered] = useState(variables);
  const [isEmpty, setIsEmpty] = useState(true);

  const isControlled = typeof value === "string";

  const recomputeEmptyFromDom = () => {
    const el = editorRef.current;
    if (!el) return;
    const text = serializeEditor(el);
    setIsEmpty(text.trim().length === 0);
  };

  const recomputeEmpty = () => {
    if (isControlled) {
      setIsEmpty((value || "").replace(/\u200b/g, "").trim().length === 0);
    } else {
      recomputeEmptyFromDom();
    }
  };

  const emitChange = () => {
    if (!onChange || !editorRef.current) return;
    const text = serializeEditor(editorRef.current);
    onChange(text);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const onDocDown = (e) => {
      if (!menuPos) return;
      const insideMenu = e.target.closest?.("[data-suggestion-list]");
      if (!insideMenu) closeMenu();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [menuPos]);

  // Initial mount
  useEffect(() => {
    if (!editorRef.current) return;

    if (isControlled) {
      syncingRef.current = true;
      hydrateFromValue(editorRef.current, value || "");
      updateTokensValidity(editorRef.current, variables);
      syncingRef.current = false;
      setIsEmpty((value || "").trim().length === 0);
    } else {
      // Uncontrolled fallback: allow seeding once from initialHtml
      editorRef.current.innerHTML = initialHtml || "";
      tokenizeTextNodes(editorRef.current);
      updateTokensValidity(editorRef.current, variables);
      recomputeEmptyFromDom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Re-validate when variables change
  useEffect(() => {
    updateTokensValidity(editorRef.current, variables);
    recomputeEmpty();
    setFiltered(variables);
  }, [variables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate DOM when controlled value changes
  useEffect(() => {
    if (!isControlled || !editorRef.current) return;
    const current = serializeEditor(editorRef.current);
    if (current !== (value || "")) {
      syncingRef.current = true;
      hydrateFromValue(editorRef.current, value || "");
      updateTokensValidity(editorRef.current, variables);
      syncingRef.current = false;
    }
    setIsEmpty((value || "").trim().length === 0);
  }, [isControlled, value, variables]);

  const closeMenu = () => {
    setMenuPos(null);
    setTrigger(null);
    setActive(0);
    setFiltered(variables);
  };

  const openOrUpdateMenu = (t) => {
    if (!t) {
      closeMenu();
      return;
    }
    const rect = getCaretRect();
    if (!rect) {
      closeMenu();
      return;
    }
    const q = t.query.trim().toLowerCase();
    const next = variables.filter((v) => v.toLowerCase().includes(q));
    setFiltered(next);
    setActive((idx) => Math.min(idx, Math.max(0, next.length - 1)));
    setMenuPos(rect);
    setTrigger(t);
  };

  /** Always escape at token end BEFORE the browser inserts characters */
  const onBeforeInput = (e) => {
    const tok = getActiveToken();
    if (tok && isCaretAtEndOf(tok)) {
      const isInsert =
        e.inputType?.startsWith("insert") ||
        e.inputType === "insertCompositionText";
      if (isInsert) {
        e.preventDefault();
        const ch = typeof e.data === "string" ? e.data : "";
        setCaretAfter(tok);
        if (ch) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            const r = sel.getRangeAt(0);
            const textNode = document.createTextNode(ch);
            r.insertNode(textNode);
            r.setStartAfter(textNode);
            r.setEndAfter(textNode);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
        closeMenu();
        if (!syncingRef.current) {
          updateTokensValidity(editorRef.current, variables);
          recomputeEmpty();
          emitChange();
        }
      }
    }
  };

  const onInput = () => {
    if (syncingRef.current) return;

    const t = detectTrigger();
    if (t) openOrUpdateMenu(t);
    else closeMenu();

    const didTokenize = maybeTokenizeRecentlyClosedVar();
    if (editorRef.current) {
      updateTokensValidity(editorRef.current, variables);
      recomputeEmpty();
      emitChange();
    }
  };

  const onKeyDown = (e) => {
    // Prevent nested tokens by blocking creation of inner "{{" / "}}"
    const tokForNest = getActiveToken();
    if (tokForNest && (e.key === "{" || e.key === "}")) {
      const { start, end } = getCaretOffsetIn(tokForNest);
      const txt = tokForNest.textContent || "";
      const prevCh = start > 0 ? txt[start - 1] : "";
      const nextCh = end < txt.length ? txt[end] : "";
      if (
        (e.key === "{" && prevCh === "{") ||
        (e.key === "}" && nextCh === "}")
      ) {
        e.preventDefault();
        return;
      }
    }

    // Cmd/Ctrl+A selects editor contents
    if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // Escape / ArrowRight at END of token => move outside
    const tok = getActiveToken();
    if (tok && isCaretAtEndOf(tok)) {
      if (e.key === "Escape" || e.key === "ArrowRight") {
        e.preventDefault();
        setCaretAfter(tok);
        closeMenu();
        return;
      }
    }

    // Menu nav
    if (!menuPos) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (filtered.length && trigger) {
        insertTokenAtSelection(trigger, filtered[active], false); // caret OUTSIDE
        updateTokensValidity(editorRef.current, variables);
        recomputeEmpty();
        emitChange();
        closeMenu();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    }
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData(
      "text/plain"
    );
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    r.deleteContents();
    const node = document.createTextNode(text);
    r.insertNode(node);
    const after = document.createRange();
    after.setStartAfter(node);
    after.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(after);
    tokenizeTextNodes(editorRef.current);
    updateTokensValidity(editorRef.current, variables);
    recomputeEmpty();
    emitChange();
  };

  const onClickSuggestion = (name) => {
    if (trigger) {
      insertTokenAtSelection(trigger, name, false); // caret OUTSIDE
      updateTokensValidity(editorRef.current, variables);
      recomputeEmpty();
      emitChange();
      closeMenu();
    }
  };

  return (
    <div>
      <label className="form-label required">Email body</label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div>
          {/* Editor + Placeholder wrapper */}
          <div style={{ position: "relative" }}>
            {/* Placeholder */}
            {isEmpty && (
              <div
                aria-hidden
                className="text-muted"
                style={{
                  position: "absolute",
                  inset: 2,
                  pointerEvents: "none",
                  padding: 14,
                  whiteSpace: "pre-wrap",
                  userSelect: "none",
                }}
              >
                {placeholder}
              </div>
            )}

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onBeforeInput={onBeforeInput}
              onInput={onInput}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              style={{
                minHeight: 220,
                padding: 14,
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
              className="form-control"
              spellCheck={false}
            />
          </div>

          <SuggestionList
            items={filtered}
            pos={menuPos}
            activeIndex={active}
            onClick={onClickSuggestion}
            onClose={closeMenu}
          />
        </div>

        <aside style={{ position: "sticky", top: 8 }}>
          <div className="card p-2">
            <div style={{ fontSize: 12, color: "#444", marginBottom: 8 }}>
              Available variables
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}
            >
              {variables.map((v) => (
                <div
                  key={v}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <code
                    style={{
                      background: "rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.15)",
                      borderRadius: 6,
                      padding: "0 6px",
                    }}
                  >{`{{${v}}}`}</code>
                  <span style={{ color: "#666", fontSize: 12 }}>
                    {mapVariable(v) || v}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: "1px solid #e6e8eb",
                marginTop: 10,
                paddingTop: 8,
                color: "#6b7280",
                fontSize: 12,
              }}
            >
              Tip: Type <code>{"{{"}</code> in the editor to open suggestions or
              type a full token like <code>{"{{name}}"}</code> to auto-insert.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

EmailTemplateEditor.defaultProps = {
  value: undefined, // when provided => controlled mode
  onChange: () => {},
  initialHtml: "",
  variables: VARIABLES,
  placeholder:
    "Type your email here…  Use {{double braces}} to insert variables, e.g., {{name}}",
};
