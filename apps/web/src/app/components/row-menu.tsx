"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

/**
 * Overflow menu for table row actions. Destructive actions live here rather
 * than as a permanently exposed button, so a daily-use list cannot be
 * mis-clicked into a delete confirmation.
 *
 * The list renders in a portal because the shared `.data-panel` clips its
 * content to keep the table's rounded corners; anchoring is recomputed from the
 * trigger, and the menu closes on scroll or resize rather than chasing it.
 */
export function RowMenu({
  label = "More actions",
  items,
  children,
}: {
  label?: string;
  items: RowMenuItem[];
  children?: ReactNode;
}) {
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const open = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const dismiss = (event: MouseEvent) => {
      const target = event.target as Node;
      if (list.current?.contains(target) || trigger.current?.contains(target)) {
        return;
      }
      close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [anchor]);

  return (
    <div className="row-menu" onClick={(event) => event.stopPropagation()}>
      {children}
      <button
        type="button"
        ref={trigger}
        className="btn row-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? menuId : undefined}
        onClick={() => (anchor ? setAnchor(null) : open())}
      >
        ⋯
      </button>
      {anchor &&
        createPortal(
          <div
            className="row-menu-list"
            id={menuId}
            role="menu"
            ref={list}
            style={{ top: anchor.top, right: anchor.right }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={item.tone === "danger" ? "danger" : ""}
                disabled={item.disabled}
                onClick={() => {
                  setAnchor(null);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
