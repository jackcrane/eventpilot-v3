import { useEffect, useRef } from "react";
import styles from "./Accordion.module.css";
import classNames from "classnames";

/**
 * Controlled Accordion
 * - Only one panel open at a time (enforced by parent via openId)
 * - Animate height on open/close (no deps)
 *
 * Props:
 * - items: Array<{ id: string, title: ReactNode, content: ReactNode }>
 * - openId: string|null
 * - onChange: (nextId: string|null) => void
 * - duration?: number (ms)
 * - easing?: string (CSS timing function)
 * - chevron?: ReactNode (optional custom icon)
 */
export const Accordion = ({
  items,
  openId,
  onChange,
  duration = 200,
  easing = "ease",
  chevron,
  className,
}) => {
  return (
    <div
      className={classNames(styles.accordion, className)}
      role="tablist"
      aria-multiselectable="false"
    >
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          id={item.id}
          title={item.title}
          isOpen={openId === item.id}
          onToggle={() => onChange(openId === item.id ? null : item.id)}
          duration={duration}
          easing={easing}
          chevron={chevron}
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  );
};

export const AccordionItem = ({
  id,
  title,
  isOpen,
  onToggle,
  children,
  duration = 200,
  easing = "ease",
  chevron,
}) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);
  const animRef = useRef(null);

  // Ensure initial height matches state without animating
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    wrapper.style.overflow = "hidden";
    wrapper.style.height = isOpen ? "auto" : "0px";
  }, []); // run once

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    // Cancel any in-flight animation
    animRef.current?.cancel();

    const start = wrapper.getBoundingClientRect().height; // current rendered height (px)
    const end = isOpen ? inner.scrollHeight : 0; // target height (px)

    // If heights are equal, nothing to animate
    if (start === end) {
      wrapper.style.height = isOpen ? "auto" : "0px";
      return;
    }

    // Lock to start height in px so we never animate from 'auto'
    wrapper.style.height = `${start}px`;

    // Use Web Animations API to tween height
    const anim = wrapper.animate(
      [{ height: `${start}px` }, { height: `${end}px` }],
      { duration, easing, fill: "forwards" }
    );
    animRef.current = anim;

    anim.onfinish = () => {
      // Snap to final state
      wrapper.style.height = isOpen ? "auto" : "0px";
      animRef.current = null;
    };
    anim.oncancel = () => {
      animRef.current = null;
    };
  }, [isOpen, duration, easing]);

  return (
    <div className={styles.item}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        id={`tab-${id}`}
        onClick={onToggle}
      >
        <span className={styles.title}>{title}</span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        >
          {chevron ?? (
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </span>
      </button>

      <div
        id={`panel-${id}`}
        role="region"
        aria-labelledby={`tab-${id}`}
        className={styles.contentWrapper}
        ref={wrapperRef}
      >
        <div ref={innerRef} className={styles.contentInner}>
          {children}
        </div>
      </div>
    </div>
  );
};
