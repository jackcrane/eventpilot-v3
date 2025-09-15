import React, { useMemo } from "react";
import { Button, Input, Spinner, Util } from "tabler-react-2";
import { Loading } from "../../../../../components/loading/Loading";
import { Empty } from "../../../../../components/empty/Empty";
import { Icon } from "../../../../../util/Icon";
import { ThreadPreview } from "./ThreadPreview";

export const ThreadListing = ({
  eventId,
  threads,
  threadsLoading,
  threadsError,
  selectedThreadId,
  query,
  onQueryChange,
  onSelectThread,
  onCompose,
  loadOlder,
  loadingOlder,
}) => {
  const tokens = useMemo(
    () =>
      String(query || "")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean),
    [query]
  );

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tokensLower = useMemo(() => tokens.map((t) => t.toLowerCase()), [tokens]);

  const highlightText = (text) => {
    if (!text) return "";
    if (!tokens.length) return text;
    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
    const parts = String(text).split(pattern);
    return parts.map((part, i) => {
      if (tokensLower.includes(String(part).toLowerCase())) {
        return (
          <mark key={`m-${i}`} style={{ background: "#ffed8a", padding: 0 }}>
            {part}
          </mark>
        );
      }
      return <span key={`t-${i}`}>{part}</span>;
    });
  };

  const sortedThreads = useMemo(() => {
    if (!threads?.length) return [];
    if (tokens.length) return threads; // rely on server relevance ordering when searching
    return [...threads].sort((a, b) => {
      const ad = new Date(a?.lastMessage?.internalDate || a?.lastInternalDate || 0).getTime();
      const bd = new Date(b?.lastMessage?.internalDate || b?.lastInternalDate || 0).getTime();
      return bd - ad; // newest first
    });
  }, [threads, tokens.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          color="primary"
          size="sm"
          onClick={() => onCompose?.()}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon i="pencil" /> Compose
          </span>
        </Button>
      </div>
      <Input
        placeholder="Search subject, sender, recipients, content, attachments"
        value={query}
        onChange={(v) => onQueryChange?.(v)}
      />
      {threadsLoading && (
        <Loading title="Loading inbox" text="Fetching your threads…" gradient={false} />
      )}
      {!threadsLoading && threadsError && (
        <span className="text-danger">Failed to load inbox</span>
      )}
      {!threadsLoading && !threadsError && sortedThreads.length === 0 && (
        <Empty title="No conversations" text="You don't have any conversations yet." gradient={false} />
      )}
      {sortedThreads.map((t) => (
        <ThreadPreview
          key={t.id}
          thread={t}
          active={t.id === selectedThreadId}
          onClick={() => onSelectThread?.(t.id)}
          highlightText={highlightText}
        />
      ))}
      <Util.Hr
        text={
          <Button size="sm" onClick={() => loadOlder?.()} disabled={threadsLoading || loadingOlder}>
            {loadingOlder ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Spinner size={"sm"} /> Loading older messages
              </span>
            ) : (
              "Load older messages"
            )}
          </Button>
        }
      />
    </div>
  );
};

