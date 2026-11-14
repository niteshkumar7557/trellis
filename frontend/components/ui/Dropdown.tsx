"use client";

// Our own dropdown, used wherever a native <select> used to be.
//
// Why not <select>: the browser draws its open list itself (a grey OS menu on macOS, a
// different one on Windows and phones), so it can't carry the theme, and its options are
// plain text: the goal picker needs a second line per option that says what the goal would
// change. A styled <select> only fixes the closed button, not the open list.
//
// Alternatives: a library (Radix Select, Headless UI, Downshift) gets every edge right but
// adds a dependency and a layer the owner would have to learn to debug; <datalist> can't
// show details either. This file is the WAI-ARIA "listbox" pattern written out, small
// enough to read in one go:
//   - a <button> with aria-haspopup="listbox" opens a <ul role="listbox">;
//   - focus moves to the list, and aria-activedescendant says which option is active, so
//     a screen reader reads options as the arrow keys move;
//   - ↑ ↓ Home End move, Enter or Space picks, Esc or Tab closes, typing jumps by name;
//   - a press anywhere outside closes it.
// Where it falls short of a library: it doesn't escape a parent with overflow:hidden (it is
// positioned inside its wrapper, not in a portal), and it doesn't flip sideways. Neither
// matters where it is used today; a portal is the fix if that changes.

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { Icon } from "./Icon";
import styles from "./dropdown.module.css";

export interface DropdownOption<V extends string> {
  value: V;
  label: string;
  /** A second line under the label, e.g. what picking this goal would change. */
  detail?: ReactNode;
  /** A heading the option sits under; options with the same group must be next to each other. */
  group?: string;
}

interface Props<V extends string> {
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  /** The accessible name, e.g. "Goal". Shown on screen only through `prefix`. */
  label: string;
  /** Shown in the button before the chosen label, e.g. a muted "Goal". */
  prefix?: ReactNode;
  /** Shown under the options, outside the list (not selectable). */
  footer?: ReactNode;
  /** "sm" fits inside a chat card; "md" is the normal control height. */
  size?: "sm" | "md";
  /** Stretch the button to its container's width (form fields). */
  block?: boolean;
  /** The open list's width; defaults to the button's. */
  menuWidth?: number;
}

// How long a typed run of letters counts as one search ("re" then "d" → "red").
const TYPEAHEAD_MS = 500;
// Matches .menu's max-height in the CSS: used to decide whether it fits below the button.
const MENU_MAX = 320;

export function Dropdown<V extends string>({ value, options, onChange, label, prefix, footer, size = "md", block, menuWidth }: Props<V>) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });

  const chosen = Math.max(0, options.findIndex((o) => o.value === value));
  const optionId = (i: number) => `${id}-o${i}`;

  const show = (start = chosen) => {
    // Open upward when there isn't room below but there is above (e.g. near the bottom of
    // the chat). Measured once on open; the page doesn't scroll while it's open often enough
    // to be worth tracking.
    const r = button.current!.getBoundingClientRect();
    setUp(window.innerHeight - r.bottom < MENU_MAX && r.top > window.innerHeight - r.bottom);
    setActive(start);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const pick = (i: number) => {
    if (options[i].value !== value) onChange(options[i].value);
    close();
  };

  // Focus the list once it exists, so the arrow keys work straight away.
  useEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open]);

  // Keep the active option in view as the arrow keys move through a long list.
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on id, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // A press outside closes it without moving focus (the press already put focus elsewhere).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return;
      gsap.from("[data-menu]", { opacity: 0, y: up ? 4 : -4, duration: 0.14 });
    },
    { dependencies: [open], scope: wrap },
  );

  const onButtonKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    const move = (i: number) => {
      e.preventDefault();
      setActive(Math.min(last, Math.max(0, i)));
    };
    switch (e.key) {
      case "ArrowDown": return move(active + 1);
      case "ArrowUp": return move(active - 1);
      case "Home": return move(0);
      case "End": return move(last);
      case "Enter":
      case " ":
        e.preventDefault();
        return pick(active);
      case "Escape":
        e.preventDefault();
        return close();
      case "Tab":
        return close(false);
    }
    // Type-ahead: jump to the next option whose label starts with what was typed.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // The event's own time (ms since the page loaded) is all a gap needs.
      const now = e.timeStamp;
      const text = (now - typed.current.at < TYPEAHEAD_MS ? typed.current.text : "") + e.key.toLowerCase();
      typed.current = { text, at: now };
      // A single letter starts after the active option, so pressing "r" again cycles
      // through every "r…"; a longer run starts at it, so "re" can stay on "Redis".
      const order = [...options.keys()].map((k) => (active + k + (text.length === 1 ? 1 : 0)) % options.length);
      const hit = order.find((i) => options[i].label.toLowerCase().startsWith(text));
      if (hit !== undefined) setActive(hit);
    }
  };

  return (
    <div ref={wrap} className={styles.wrap} data-size={size} data-block={block || undefined}>
      <button
        ref={button}
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${options[chosen]?.label ?? ""}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={onButtonKey}
      >
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <span className={styles.value}>{options[chosen]?.label}</span>
        <Icon name="chevron" size={14} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.menu} data-menu data-up={up || undefined} style={menuWidth ? { width: menuWidth } : undefined}>
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={optionId(active)}
            className={styles.list}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => (
              <li key={o.value} role="presentation">
                {o.group && o.group !== options[i - 1]?.group && (
                  <span className={styles.group} aria-hidden="true">
                    {o.group}
                  </span>
                )}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === chosen}
                  data-active={i === active || undefined}
                  className={styles.option}
                  // pointerdown would fire before the outside-press check; click is enough.
                  onClick={() => pick(i)}
                  onPointerMove={() => i !== active && setActive(i)}
                >
                  <span className={styles.optionText}>
                    <span className={styles.optionLabel}>
                      {o.label}
                      {/* The group heading is hidden from screen readers (it isn't an option),
                          so each option carries its group in its spoken name instead. */}
                      {o.group && <span className="visually-hidden">, {o.group}</span>}
                    </span>
                    {o.detail && <span className={styles.optionDetail}>{o.detail}</span>}
                  </span>
                  {i === chosen && <Icon name="check" size={14} className={styles.tick} />}
                </div>
              </li>
            ))}
          </ul>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
