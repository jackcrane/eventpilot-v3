import React, { useEffect, useRef, useState } from "react";

/**
 * Demo: Email-blast template editor with token autocomplete on "{{".
 * - No external deps
 * - ContentEditable editor that inserts shaded token chips like {{name}}
 * - Suggestion list appears as you type after "{{" and filters by your query
 * - Keyboard: ↑/↓ to navigate, Enter/Tab to insert, Esc to close, Cmd/Ctrl+A selects editor contents
 * - Click a suggestion to insert, tokens are editable
 * - Cursor rules inside tokens: if caret is at the end of a token, Space/Esc/ArrowRight will move caret outside.
 * - Paste is plain-text only; we then tokenize any {{var}} occurrences.
 * - Nested tokens are prevented; if a user tries, we normalize the token back to a single {{identifier}}.
 */

/** Available template variables */
export const VARIABLES = ["name", "email", "unsubscribeLink"];

/** Regex helpers */
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g; // matches {{ varName }}
const FIRST_VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/; // first match

/** Utility: get the caret (selection) client rect */
export const getCaretRect = () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects && rects.length) return rects[0];
  // Fallback: create a temporary span
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

/** Create a token element */
export const createTokenEl = (tokenText) => {
  const token = document.createElement("span");
  token.textContent = `{{${tokenText}}}`;
  token.setAttribute("data-token", tokenText);
  token.style.background = "rgba(0,0,0,0.06)"; // slightly darker background
  token.style.border = "1px solid rgba(0,0,0,0.15)";
  token.style.borderRadius = "6px";
  token.style.padding = "0 4px";
  token.style.margin = "0 1px";
  token.style.fontFamily =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
  token.style.whiteSpace = "pre";
  return token;
};

/** Get token element if selection/caret is inside one */
export const getActiveToken = () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.anchorNode;
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    const el = node.closest("[data-token]");
    return el || null;
  }
  return null;
};

/** Move caret after a node */
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

/** Insert a token at selection, replacing the trigger text */
export const insertTokenAtSelection = (
  triggerInfo,
  tokenText,
  placeCaretInside = true
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
      // Caret at end *inside* token (per requirement)
      const innerRange = document.createRange();
      innerRange.selectNodeContents(token);
      innerRange.collapse(false);
      sel.removeAllRanges();
      sel.addRange(innerRange);
    } else {
      setCaretAfter(token);
    }
  } catch (e) {
    const r = sel.getRangeAt(0);
    r.insertNode(token);
    setCaretAfter(token);
  }
};

/** Detect an active "{{query" trigger near the caret within a single text node. */
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

/** Normalize a token element's text to {{identifier}} and update data-token. */
export const normalizeTokenEl = (el) => {
  const raw = el.textContent || "";
  const m = FIRST_VAR_RE.exec(raw);
  if (m) {
    const id = m[1];
    el.textContent = `{{${id}}}`;
    el.setAttribute("data-token", id);
  } else {
    // If it no longer resembles a token, unwrap to plain text
    const text = document.createTextNode(raw.replaceAll("\n", " "));
    el.replaceWith(text);
    return null;
  }
  return el;
};

/** Walk text nodes under root and replace {{var}} with token spans (skip inside existing tokens). */
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

/** SuggestionList: floating menu */
/** Caret offset utilities */
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

/** The editor */
export const EmailTemplateEditor = ({ initialHtml, variables }) => {
  const editorRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const [active, setActive] = useState(0);
  const [trigger, setTrigger] = useState(null); // { node, startOffset, query }
  const [filtered, setFiltered] = useState(variables);

  // Initialize content
  useEffect(() => {
    if (editorRef.current) {
      if (initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
      // Tokenize any pre-existing {{...}}
      tokenizeTextNodes(editorRef.current);
    }
  }, [initialHtml]);

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

  const onInput = () => {
    // Do NOT normalize on every input; it was resetting the caret to start of token.
    // Just process trigger detection so suggestions work while editing (even inside tokens).
    const t = detectTrigger();
    openOrUpdateMenu(t);
  };

  const onKeyDown = (e) => {
    // Prevent nested tokens inside a token: if user types a second '{' or '}' consecutively, block it.
    const tokForNest = getActiveToken();
    if (tokForNest && (e.key === "{" || e.key === "}")) {
      const { start, end } = getCaretOffsetIn(tokForNest);
      // get surrounding characters
      const txt = tokForNest.textContent || "";
      const prevCh = start > 0 ? txt[start - 1] : "";
      const nextCh = end < txt.length ? txt[end] : "";
      // Block creating '{{' or '}}' sequences beyond the outer braces
      if (
        (e.key === "{" && prevCh === "{") ||
        (e.key === "}" && nextCh === "}")
      ) {
        e.preventDefault();
        return;
      }
    }
    // Editor-wide select-all
    if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // Inside-token navigation: if caret at END of token and Space/Escape/ArrowRight, move outside
    const tok = getActiveToken();
    if (tok) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const temp = document.createRange();
        temp.selectNodeContents(tok);
        const atEnd =
          r.collapsed &&
          r.endContainer &&
          tok.contains(r.endContainer) &&
          r.compareBoundaryPoints(Range.END_TO_END, temp) === 0;
        if (
          atEnd &&
          (e.key === " " || e.key === "Escape" || e.key === "ArrowRight")
        ) {
          e.preventDefault();
          if (e.key === " ") tok.after(document.createTextNode(" "));
          setCaretAfter(tok);
          closeMenu();
          return;
        }
      }
    }

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
        insertTokenAtSelection(
          trigger,
          filtered[active],
          /*placeCaretInside*/ true
        );
        closeMenu();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    }
  };

  const onPaste = (e) => {
    // Plain-text paste only; then tokenize
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
    // Move caret after pasted text node
    const after = document.createRange();
    after.setStartAfter(node);
    after.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(after);
    // Tokenize any {{...}} we just inserted
    tokenizeTextNodes(editorRef.current);
  };

  const onClickSuggestion = (name) => {
    if (trigger) {
      insertTokenAtSelection(trigger, name, /*placeCaretInside*/ true);
      closeMenu();
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 360px",
        gap: 16,
        alignItems: "start",
      }}
    >
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "#555",
            marginBottom: 6,
          }}
        >
          Email body
        </label>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          style={{
            minHeight: 220,
            padding: 14,
            border: "1px solid #cfd4dc",
            borderRadius: 10,
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
            lineHeight: 1.5,
            outline: "none",
            background: "#fff",
            wordBreak: "break-word",
          }}
          spellCheck={false}
        >
          {/* default content if none provided */}
          {!initialHtml && (
            <>
              Hello{" "}
              <span
                data-token="name"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 6,
                  padding: "0 4px",
                  margin: "0 1px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono'",
                }}
              >
                {"{{name}}"}
              </span>
              , &nbsp;Thanks for getting involved at Paddlefest! We’re excited
              to have you.
              <br />
              <br />
              Your event:{" "}
              <span
                data-token="eventName"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 6,
                  padding: "0 4px",
                  margin: "0 1px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono'",
                }}
              >
                {"{{eventName}}"}
              </span>{" "}
              on{" "}
              <span
                data-token="eventDate"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 6,
                  padding: "0 4px",
                  margin: "0 1px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono'",
                }}
              >
                {"{{eventDate}}"}
              </span>{" "}
              at{" "}
              <span
                data-token="eventLocation"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 6,
                  padding: "0 4px",
                  margin: "0 1px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono'",
                }}
              >
                {"{{eventLocation}}"}
              </span>
              .
              <br />
              Register here:{" "}
              <span
                data-token="registrationLink"
                style={{
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 6,
                  padding: "0 4px",
                  margin: "0 1px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono'",
                }}
              >
                {"{{registrationLink}}"}
              </span>
              <br />
              <br />— Paddlefest Team
            </>
          )}
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
        <div
          style={{
            border: "1px solid #cfd4dc",
            borderRadius: 10,
            padding: 12,
            background: "#fbfcfe",
          }}
        >
          <div style={{ fontSize: 12, color: "#444", marginBottom: 8 }}>
            Available variables
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
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
                <span style={{ color: "#666", fontSize: 12 }}>{v}</span>
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
            Tip: Type <code>{"{{"}</code> in the editor to open suggestions.
          </div>

          <TestsPanel />
        </div>
      </aside>
    </div>
  );
};

EmailTemplateEditor.defaultProps = {
  initialHtml: "",
  variables: VARIABLES,
};
