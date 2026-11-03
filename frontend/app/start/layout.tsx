import Link from "next/link";
import { Mark } from "@/components/ui/Mark";
import styles from "./start.module.css";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <Mark size={20} />
          Trellis
        </Link>
        <span className={styles.barTitle}>Set up your map</span>
        <Link href="/map" className={styles.skip}>
          Go to my map
        </Link>
      </header>
      <main className={styles.sheet}>{children}</main>
    </div>
  );
}
