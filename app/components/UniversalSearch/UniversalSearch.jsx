import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useEventSearch } from "../../hooks/useEventSearch";
import styles from "./universalSearch.module.css";

const getIsMacLike = () => {
  if (typeof window === "undefined" || !window.navigator) {
    return true;
  }
  const platform = window.navigator.platform?.toLowerCase?.() ?? "";
  return platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad");
};

export const UniversalSearch = ({
  eventId,
  onResultSelected,
  placeholder = "Search anything across your event…",
  minChars = 2,
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxId = useId();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMacLike, setIsMacLike] = useState(getIsMacLike());
  const trimmedQuery = query.trim();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.key) return;
      const isK = event.key.toLowerCase?.() === "k";
      const hasModifier = event.metaKey || event.ctrlKey;
      if (isK && hasModifier) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsActive(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsActive(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (trimmedQuery.length >= minChars || trimmedQuery.length === 0) {
        setDebouncedQuery(trimmedQuery);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [trimmedQuery, minChars]);

  useEffect(() => {
    setIsMacLike(getIsMacLike());
  }, []);

  const { results, loading } = useEventSearch({
    eventId,
    query: debouncedQuery.length >= minChars ? debouncedQuery : "",
  });

  useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
  }, [results.length, debouncedQuery]);

  const showResults = useMemo(() => isActive, [isActive]);


  const handleSelect = (result) => {
    if (!result) return;
    onResultSelected?.(result);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!results.length) return;
      setActiveIndex((prev) => {
        const next = Math.min(prev + 1, results.length - 1);
        return next;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      setActiveIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        return next;
      });
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        handleSelect(results[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setIsActive(false);
      inputRef.current?.blur();
    }
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const shortcutDisplay = isMacLike ? "⌘" : "Ctrl";
  const isDisabled = !eventId;
  const hintText = isDisabled
    ? "Select an event to start searching"
    : placeholder;

  return (
    <div className={`${styles.wrapper} dropdown`} ref={containerRef}>
      <div className="input-group input-group-flat">
        <span className="input-group-text">
          <FiSearch size={16} aria-hidden="true" className="text-muted" />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsActive(true)}
          onKeyDown={handleKeyDown}
          placeholder={hintText}
          disabled={isDisabled}
          className="form-control"
          aria-label="Universal search"
          aria-controls={showResults ? listboxId : undefined}
          aria-expanded={showResults}
        />
        <span className="input-group-text" aria-hidden="true">
          <span className={styles.shortcut}>
            <kbd className="kbd">{shortcutDisplay}</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </span>
      </div>
      {showResults && (
        <div
          className={`${styles.resultsPanel} dropdown-menu dropdown-menu-card dropdown-menu-end show`}
          role="listbox"
          id={listboxId}
          aria-activedescendant={activeOptionId}
        >
          {loading && (
            <div className="card-body text-muted small" role="status">
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="card-body text-muted small" role="status">
              {debouncedQuery.length >= minChars
                ? `No results for “${debouncedQuery}”.`
                : "Start typing to search across your event."}
            </div>
          )}
          {!loading && results.length > 0 && (
            <div className={`list-group list-group-flush ${styles.resultsScroll}`}>
              {results.map((result, index) => {
                return (
                  <button
                    key={`${result.resourceType}-${result.resourceId}`}
                    type="button"
                    className={`list-group-item list-group-item-action ${styles.resultItem} ${index === activeIndex ? "active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    aria-selected={index === activeIndex}
                    id={`${listboxId}-option-${index}`}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-semibold">
                        {result.title || result.resourceId}
                      </span>
                    </div>
                    <div className="d-flex gap-2 flex-wrap text-muted small mt-1">
                      {result.resourceKind && (
                        <span className="badge bg-blue-lt text-blue">
                          {result.resourceKind}
                        </span>
                      )}
                      {result.subtitle && <span>{result.subtitle}</span>}
                    </div>
                    {result.description && (
                      <div className="text-muted small mt-1">
                        {result.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
