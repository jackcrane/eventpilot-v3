// HeroNav.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./HeroNav.module.css";
import { Icon } from "../../util/Icon";

export const HeroNav = ({
  items = [
    { label: "Overview", href: "#" },
    { label: "Versus...", href: "#versus" },
    { label: "Docs", href: "https://docs.eventpilot.dev" },
    { label: "Contact", href: "mailto:support@geteventpilot.com" },
  ],
}) => {
  const navRef = useRef(null);
  const hovRef = useRef(null);
  const itemRefs = useMemo(() => items.map(() => ({ current: null })), [items]);
  const [box, setBox] = useState({ x: 0, w: 0, visible: false });
  const [menuOpen, setMenuOpen] = useState(false);

  // Recompute on resize
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => {
      if (typeof nav.__lastIndex === "number") {
        const el = itemRefs[nav.__lastIndex]?.current;
        if (el) {
          setBox({
            x: el.offsetLeft,
            w: el.offsetWidth,
            visible: nav.__lastVisible ?? false,
          });
        }
      }
    });
    ro.observe(nav);
    return () => ro.disconnect();
  }, [itemRefs]);

  const updateToIndex = (i) => {
    const nav = navRef.current;
    const el = itemRefs[i]?.current;
    if (!nav || !el) return;
    nav.__lastIndex = i;
    nav.__lastVisible = true;
    setBox({ x: el.offsetLeft, w: el.offsetWidth, visible: true });
  };

  const nearestIndexFromPointer = (e) => {
    const nav = navRef.current;
    if (!nav) return null;
    const rect = nav.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let bestI = 0,
      bestD = Infinity;
    for (let i = 0; i < itemRefs.length; i++) {
      const el = itemRefs[i].current;
      if (!el) continue;
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(x - cx);
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    return bestI;
  };

  // Close mobile menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (!navRef.current) return;
      if (navRef.current.contains(e.target)) return; // clicks inside nav are fine
      setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className={styles.heroNavWrapper}>
      <nav
        ref={navRef}
        className={styles.heroNav}
        aria-label="Top navigation"
        onPointerMove={(e) => {
          const i = nearestIndexFromPointer(e);
          if (i != null) updateToIndex(i);
        }}
        onPointerLeave={() => {
          const nav = navRef.current;
          if (nav) nav.__lastVisible = false;
          setBox((b) => ({ ...b, visible: false }));
        }}
      >
        {/* Desktop hover highlight */}
        <div
          ref={hovRef}
          className={styles.heroNav__hover}
          style={{
            transform: `translateX(${box.x}px)`,
            width: box.w,
            opacity: box.visible ? 1 : 0,
          }}
          aria-hidden
        />

        {/* Desktop items */}
        <div className={styles.heroNav__items}>
          {items.map((item, i) => (
            <a
              key={item.label}
              ref={(el) => (itemRefs[i].current = el)}
              href={item.href}
              className={styles.heroNav__item}
              onFocus={() => updateToIndex(i)}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger trigger */}
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon i="menu" size={24} />
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className={styles.mobileMenu} role="menu">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={styles.mobileMenu__item}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
