import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import styles from "./start.module.css";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <header className={styles.bar}>
        <Link href="/" className={styles.brand}>
          <Logo size={20} />
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
