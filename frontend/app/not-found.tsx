// The page for an address that doesn't exist. Next shows this for any unknown route.
// It follows the app's "framed sheet" look, with the espalier in winter: bare wood, nothing
// on this branch.

import Link from "next/link";
import { Espalier } from "@/components/art/Espalier";
import { Logo } from "@/components/brand/Logo";
import ui from "@/components/ui/ui.module.css";
import styles from "./not-found.module.css";

export const metadata = { title: "Not on the map" };

export default function NotFound() {
  return (
    <div className={styles.frame}>
      <main className={styles.sheet}>
        <Link href="/" className={styles.brand} aria-label="Trellis, home">
          <Logo size={22} />
        </Link>
        <div className={styles.body}>
          <Espalier className={styles.art} layers={["bare"]} tiers={[3, 3, 2]} seed={4} title="A bare espalier in winter" />
          <h1 className={styles.title}>This branch isn&apos;t on the map</h1>
          <p className={styles.text}>The page you asked for doesn&apos;t exist, or it has moved. Nothing of yours is lost.</p>
          <div className={styles.actions}>
            <Link href="/map" className={ui.primary}>
              Open the map
            </Link>
            <Link href="/" className={ui.btn}>
              Go to the front page
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
