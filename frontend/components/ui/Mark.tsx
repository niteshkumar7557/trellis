// The Trellis mark: an espalier — one trunk, three trained tiers — drawn on a 24 grid.
export function Mark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 22V3M12 7.5c-2.6 0-5.2-.2-8-1.5M12 7.5c2.6 0 5.2-.2 8-1.5M12 12.5c-2.8 0-5.6-.3-8.5-1.8M12 12.5c2.8 0 5.6-.3 8.5-1.8M12 17.5c-3 0-6-.4-9-2M12 17.5c3 0 6-.4 9-2"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
