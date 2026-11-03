import Link from "next/link";
import { Espalier } from "@/components/art/Espalier";
import { Mark } from "@/components/ui/Mark";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <main className={styles.sheet}>
        <div className={styles.formSide}>
          <Link href="/" className={styles.brand}>
            <Mark size={22} />
            Trellis
          </Link>
          <div className={styles.form}>{children}</div>
          <p className={styles.fine}>Your record is private. Nobody else ever sees it.</p>
        </div>
        <figure className={styles.plate}>
          <Espalier className={styles.art} tiers={[4, 4, 3, 3, 2]} ripeness={0.55} seed={11} />
          <figcaption>A pear trained along wires, one tier at a time. Trellis does that to a subject.</figcaption>
        </figure>
      </main>
    </div>
  );
}
