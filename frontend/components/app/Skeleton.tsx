import styles from "./skeleton.module.css";

/*
  What the app shows while the store finds out who is here (mode "loading").

  Why a skeleton and not the real sidebar: until /api/state answers, the store holds the
  sample student, so the real sidebar would flash "React Native" and "Sample student"
  before a signed-in student's own subjects replace them. Grey shapes in the same places
  say "loading" without claiming anything, and the page doesn't jump when the real one
  arrives because every shape sits where its real counterpart will.

  The alternative was rendering nothing (what the sheet did before): no wrong data, but
  a blank frame for a moment reads as broken. The shapes are plain CSS, no library.
*/

/** A grey bar standing in for a line of text or a control. */
function Bone({ w, h = 12, className }: { w: number | string; h?: number; className?: string }) {
  return <span className={`${styles.bone} ${className ?? ""}`} style={{ width: w, height: h }} />;
}

/** The sidebar under the logo: three nav rows, one subject with its track, the user. */
export function SidebarSkeleton() {
  return (
    <div className={styles.sidebar} aria-hidden="true">
      <div className={styles.nav}>
        {[56, 78, 64].map((w) => (
          <div key={w} className={styles.navRow}>
            <Bone w={16} h={16} />
            <Bone w={w} />
          </div>
        ))}
      </div>
      <div className={styles.group}>
        <Bone w={80} h={10} />
        <div className={styles.subject}>
          <Bone w="60%" />
          <Bone w="100%" h={3} />
        </div>
      </div>
      <div className={styles.user}>
        <Bone w={28} h={28} className={styles.round} />
        <div className={styles.userText}>
          <Bone w={90} />
          <Bone w={120} h={10} />
        </div>
      </div>
    </div>
  );
}

/**
 * The sheet. On /map it takes the map page's shape (header, canvas with a few boxes,
 * helper column); elsewhere a heading and some lines, since Check-ins and Settings are
 * text pages.
 */
export function PageSkeleton({ map }: { map: boolean }) {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading your map">
      <div className={styles.header}>
        <div className={styles.field}>
          <Bone w={48} h={10} />
          <Bone w={180} h={22} />
        </div>
        <div className={styles.field}>
          <Bone w={36} h={10} />
          <Bone w={150} h={22} />
        </div>
      </div>
      {map ? (
        <div className={styles.body}>
          <div className={styles.canvas}>
            {/* Boxes in a loose rising column, like the bottom of a real map. */}
            {[
              [42, 72],
              [24, 50],
              [58, 50],
              [40, 28],
            ].map(([x, y]) => (
              <span key={`${x}-${y}`} className={styles.node} style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
          </div>
          <div className={styles.rail}>
            <Bone w={70} />
            <Bone w="85%" />
            <Bone w="65%" />
          </div>
        </div>
      ) : (
        <div className={styles.lines}>
          <Bone w="70%" />
          <Bone w="55%" />
          <Bone w="62%" />
        </div>
      )}
    </div>
  );
}
