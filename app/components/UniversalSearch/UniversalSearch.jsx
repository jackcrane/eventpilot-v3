import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { useEventSearch } from "../../hooks/useEventSearch";
import styles from "./universalSearch.module.css";
import { handleSearchResultNavigation } from "./resultActions";
import { useOffcanvas, useConfirm } from "tabler-react-2";
import { FormResponseRUD } from "../formResponseRUD/FormResponseRUD";
import { TodoItemRUD } from "../TodoItemRUD/TodoItemRUD";
import { TeamCRUD } from "../TeamCRUD/TeamCRUD";
import { UpsellItemCRUD } from "../UpsellItemCRUD/UpsellItemCRUD";
import { CouponCRUD } from "../CouponCRUD/CouponCRUD";
import toast from "react-hot-toast";

const getIsMacLike = () => {
  if (typeof window === "undefined" || !window.navigator) {
    return true;
  }
  const platform = window.navigator.platform?.toLowerCase?.() ?? "";
  return platform.includes("mac") || platform.includes("iphone") || platform.includes("ipad");
};

export const UniversalSearch = ({
  eventId,
  placeholder = "Search anything across your event…",
  minChars = 3,
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);
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
  const visibleResults = useMemo(() => results.slice(0, 15), [results]);

  useEffect(() => {
    setActiveIndex(visibleResults.length ? 0 : -1);
    optionRefs.current = [];
  }, [visibleResults.length, debouncedQuery]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const node = optionRefs.current[activeIndex];
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const showResults = useMemo(() => isActive, [isActive]);

  const {
    offcanvas: volunteerOffcanvas,
    OffcanvasElement: VolunteerOffcanvasElement,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1100 },
  });
  const {
    offcanvas: volunteerSubOffcanvas,
    OffcanvasElement: VolunteerSubOffcanvasElement,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 470, zIndex: 1101 },
  });
  const {
    offcanvas: todoOffcanvas,
    OffcanvasElement: TodoOffcanvasElement,
    close: closeTodoOffcanvas,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1095 },
  });
  const {
    offcanvas: teamOffcanvas,
    OffcanvasElement: TeamOffcanvasElement,
    close: closeTeamOffcanvas,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1090 },
  });
  const {
    offcanvas: upsellOffcanvas,
    OffcanvasElement: UpsellOffcanvasElement,
    close: closeUpsellOffcanvas,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1090 },
  });
  const {
    offcanvas: couponOffcanvas,
    OffcanvasElement: CouponOffcanvasElement,
    close: closeCouponOffcanvas,
  } = useOffcanvas({
    offcanvasProps: { position: "end", size: 520, zIndex: 1085 },
  });
  const { confirm, ConfirmModal } = useConfirm({
    title: "Confirm",
    text: "Are you sure?",
    commitText: "Confirm",
    cancelText: "Cancel",
  });

  const openVolunteer = useCallback(
    ({ resourceId }) => {
      if (!resourceId) {
        toast.error("Unable to open volunteer");
        return;
      }
      volunteerOffcanvas({
        content: (
          <FormResponseRUD
            id={resourceId}
            confirm={confirm}
            subOffcanvas={volunteerSubOffcanvas}
          />
        ),
      });
    },
    [volunteerOffcanvas, volunteerSubOffcanvas, confirm]
  );

  const openTodo = useCallback(
    ({ resourceId }) => {
      if (!eventId || !resourceId) {
        toast.error("Unable to open todo");
        return;
      }
      todoOffcanvas({
        content: (
          <TodoItemRUD
            eventId={eventId}
            todoId={resourceId}
            onClose={closeTodoOffcanvas}
          />
        ),
      });
    },
    [eventId, todoOffcanvas, closeTodoOffcanvas]
  );

  const openTeam = useCallback(
    ({ resourceId }) => {
      if (!eventId) {
        toast.error("Unable to open team");
        return;
      }
      teamOffcanvas({
        content: (
          <TeamCRUD team={{ id: resourceId }} onClose={closeTeamOffcanvas} />
        ),
      });
    },
    [eventId, teamOffcanvas, closeTeamOffcanvas]
  );

  const openUpsell = useCallback(
    ({ resourceId }) => {
      if (!eventId) {
        toast.error("Unable to open upsell");
        return;
      }
      upsellOffcanvas({
        content: (
          <UpsellItemCRUD
            upsellItem={{ id: resourceId }}
            onClose={closeUpsellOffcanvas}
          />
        ),
      });
    },
    [eventId, upsellOffcanvas, closeUpsellOffcanvas]
  );

  const openCoupon = useCallback(
    ({ resourceId }) => {
      if (!eventId) {
        toast.error("Unable to open coupon");
        return;
      }
      couponOffcanvas({
        content: (
          <CouponCRUD coupon={{ id: resourceId }} onClose={closeCouponOffcanvas} eventId={eventId} />
        ),
      });
    },
    [eventId, couponOffcanvas, closeCouponOffcanvas]
  );

  const handleSelect = (result) => {
    if (!result) return;
    handleSearchResultNavigation({
      result,
      eventId,
      actions: { openVolunteer, openTodo, openTeam, openUpsell, openCoupon },
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visibleResults.length) return;
      setActiveIndex((prev) => {
        const next = Math.min(prev + 1, visibleResults.length - 1);
        return next;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!visibleResults.length) return;
      setActiveIndex((prev) => {
        const next = Math.max(prev - 1, 0);
        return next;
      });
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && visibleResults[activeIndex]) {
        event.preventDefault();
        handleSelect(visibleResults[activeIndex]);
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
    <>
      {VolunteerOffcanvasElement}
      {VolunteerSubOffcanvasElement}
      {TodoOffcanvasElement}
      {TeamOffcanvasElement}
      {UpsellOffcanvasElement}
      {CouponOffcanvasElement}
      {ConfirmModal}
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
            <div className={styles.emptyState} role="status">
              <div className={styles.emptyTitle}>Searching…</div>
              <div className={styles.emptyDescription}>
                We’re looking across CRM, teams, registrations, and more.
              </div>
            </div>
          )}
          {!loading && trimmedQuery.length < minChars && (
            <div className={styles.emptyState} role="status">
              <div className={styles.emptyTitle}>
                Enter at least {minChars} characters
              </div>
              <div className={styles.emptyDescription}>
                Try searching by name, email, team code, or anything else
                you track for this event.
              </div>
            </div>
          )}
          {!loading &&
            trimmedQuery.length >= minChars &&
            results.length === 0 && (
              <div className={styles.emptyState} role="status">
                <div className={styles.emptyTitle}>
                  No results for “{debouncedQuery}”
                </div>
                <div className={styles.emptyDescription}>
                  Refine your search or try a different keyword.
                </div>
              </div>
            )}
          {!loading && trimmedQuery.length >= minChars && visibleResults.length > 0 && (
            <div className={`list-group list-group-flush ${styles.resultsScroll}`}>
              {visibleResults.map((result, index) => {
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
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
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
              {results.length > visibleResults.length && (
                <div className="list-group-item text-muted small text-center">
                  To view more results, refine your search.
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
};
