"use client";

// The landing page. Its idea: the page is the map. The first screen is the real React
// Native graph on a sheet of paper, drawn as a trellis, and every section after it shows
// one thing Trellis does with that map, using the sample student's real record.
//
//   Hero        the map itself, live (HeroMap.tsx)
//   Stuck       the "may be why" rule, played as you scroll (StuckTrace.tsx)
//   Prompt      the assembled prompt, and where each part came from (PromptSlip.tsx)
//   Subjects    the two graphs that exist, at their real sizes
//   Won't do    the promises, beside an espalier that turns through its seasons
//   Start       the one action
//
// Everything the sections show is computed in ./sample.ts from shared/. This file holds
// the page's frame, its small sections and the motion they share.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Espalier } from "@/components/art/Espalier";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/components/brand/brand";
import { MiniMap } from "@/components/map/MiniMap";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useStore } from "@/lib/store";
import { bigTopicsOf, SOURCE, subjects } from "@shared/data";
import { display } from "./fonts";
import { HeroMap } from "./HeroMap";
import { PromptSlip } from "./PromptSlip";
import { sizeOf } from "./sample";
import { StuckTrace } from "./StuckTrace";
import styles from "./landing.module.css";

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The first screen's words arrive with the map, heading first.
        gsap.from("[data-hero] [data-rise]", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 });

        // Each section's parts rise in once, in reading order, as the section arrives.
        gsap.utils.toArray<HTMLElement>("[data-section]").forEach((section) => {
          const parts = section.querySelectorAll("[data-rise]");
          if (!parts.length) return;
          gsap.from(parts, {
            y: 24,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.075,
            scrollTrigger: { trigger: section, start: "top 78%", once: true },
          });
        });

        // The one moving picture: the espalier turns through its seasons, slowly, for ever.
        const seasons = gsap.utils.toArray<HTMLElement>("[data-season]");
        gsap.set(seasons.slice(1), { opacity: 0 });
        const turn = gsap.timeline({ repeat: -1, delay: 2 });
        seasons.forEach((season, i) => {
          const following = seasons[(i + 1) % seasons.length];
          turn.to(following, { opacity: 1, duration: 1.6, ease: "sine.inOut" }, "+=3.5");
          turn.to(season, { opacity: 0, duration: 1.6, ease: "sine.inOut" }, "<");
        });
        // A hidden tab should not keep animating.
        const onVisibility = () => (document.hidden ? turn.pause() : turn.resume());
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
      });

      // With less motion asked for, the plate simply shows the tree in fruit.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const seasons = gsap.utils.toArray<HTMLElement>("[data-season]");
        gsap.set(seasons, { opacity: 0 });
        gsap.set(seasons[seasons.length - 1], { opacity: 1 });
      });

      // The web font changes text heights after first paint; measure the triggers again.
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`${styles.page} ${display.variable}`}>
      <main>
        <Hero />
        <StuckTrace />
        <PromptSlip />
        <Subjects />
        <WontDo />
        <Start />
      </main>
      <Footer />
    </div>
  );
}

// ------------------------------------------------------------ hero

function Hero() {
  const { mode } = useStore();
  return (
    <section className={styles.hero} data-hero aria-labelledby="hero-title">
      <header className={styles.nav}>
        <Link href="/" className={styles.navBrand} aria-label="Trellis, home">
          <Logo size={22} color={BRAND.leafOnDark} />
        </Link>
        <nav className={styles.navLinks} aria-label="Site">
          <a href="#stuck-title">How it works</a>
          <a href="#subjects-title">Subjects</a>
          {/* Someone already signed in gets one way back to their map, not a login form
              they don't need. While the store is still finding out who is here, the
              space is kept but nothing shows, so the links don't swap in front of them. */}
          <span className={styles.navAccount} data-loading={mode === "loading" || undefined}>
            {mode === "live" ? (
              <Link href="/map" className={styles.button} data-tone="paper">
                Open your map
              </Link>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/signup" className={styles.button} data-tone="paper">
                  Start your map
                </Link>
              </>
            )}
          </span>
        </nav>
      </header>

      <div className={styles.heroHead}>
        <h1 id="hero-title" className={styles.heroTitle} data-rise>
          The map of what you&apos;re learning.
        </h1>
        <div className={styles.heroSide}>
          <p className={styles.heroSub} data-rise>
            Trellis shows what to study next, what you can skip, and the earlier topic that is really why you&apos;re
            stuck. It never teaches. It writes the prompt for your own AI.
          </p>
          <p className={styles.heroFacts} data-rise>
            Free and private. No streaks, no reminders.
          </p>
        </div>
      </div>

      <HeroMap />

      <p className={styles.heroCaption}>
        This is React Native, as one sample student has it today. Pick a topic, or change the goal.
      </p>
    </section>
  );
}

// ------------------------------------------------------------ subjects: the two graphs, at their real sizes

function Subjects() {
  return (
    <section className={styles.subjects} data-section aria-labelledby="subjects-title">
      <div className={styles.subjectsHead}>
        <h2 id="subjects-title" className={styles.h2} data-rise>
          Two subjects, drawn in full
        </h2>
        <p className={styles.lead} data-rise>
          A map is only worth following if every link on it was checked by a person. So there are two for now. Ask for
          another when you sign up and the request is kept.
        </p>
      </div>
      <div className={styles.subjectGrid}>
        {subjects.map((s) => {
          const size = sizeOf(s.id);
          // Every big topic counts as "on the goal" here, so the whole shape is drawn in ink.
          const all = new Set(bigTopicsOf(s.id).map((t) => t.id));
          return (
            <Link key={s.id} href="/signup" className={styles.subject} data-rise>
              <MiniMap subjectId={s.id} required={all} width={520} height={250} className={styles.subjectMap} />
              <span className={styles.subjectName}>{s.name}</span>
              <span className={`${styles.subjectSize} num`}>
                {size.big} big topics, {size.small} smaller ones, about {size.hours} hours of study
              </span>
            </Link>
          );
        })}
      </div>
      <p className={styles.subjectsNote} data-rise>
        Topic names and grouping follow{" "}
        <a href={SOURCE.url} target="_blank" rel="noreferrer">
          {SOURCE.name}
        </a>
        . The links between topics, and which ones you can skip, are ours.
      </p>
    </section>
  );
}

// ------------------------------------------------------------ what it won't do

const WONT = [
  { word: "teach", fact: "Your own AI does that. Trellis hands it the right question." },
  { word: "nag", fact: "No reminders and no streaks. It waits until you come back." },
  { word: "judge", fact: "Stuck is information, and the most useful thing you can say." },
  { word: "tell", fact: "No other student, teacher or group can see your record." },
  { word: "forget", fact: "What made a topic click comes back in your next prompt." },
];

function WontDo() {
  return (
    <section className={styles.wont} data-section aria-labelledby="wont-title">
      <h2 id="wont-title" className={styles.h2} data-rise>
        What it won&apos;t do
      </h2>
      <ul className={styles.wontList}>
        {WONT.map((w) => (
          <li key={w.word} data-rise>
            <span className={styles.wontWord}>{w.word}</span>
            <span className={styles.wontFact}>{w.fact}</span>
          </li>
        ))}
      </ul>
      <p className={styles.wontFor} data-rise>
        Made for subjects where one idea stands on another: building apps, running databases, maths, physics. Not for
        memorising, a craft you practise, or an exam next week.
      </p>

      <figure className={styles.plate} data-rise>
        <div className={styles.plateArt}>
          <div className={styles.season} data-season="bare">
            <Espalier layers={["bare"]} seed={7} title="An espalier in winter: bare trained wood" />
          </div>
          <div className={styles.season} data-season="leaf">
            <Espalier layers={["bare", "leaf"]} seed={7} title="The espalier in leaf" />
          </div>
          <div className={styles.season} data-season="blossom">
            <Espalier layers={["bare", "leaf", "blossom"]} seed={7} title="The espalier in blossom" />
          </div>
          <div className={styles.season} data-season="fruit">
            <Espalier layers={["bare", "leaf", "fruit"]} seed={7} ripeness={0.62} title="The espalier in fruit" />
          </div>
        </div>
        <figcaption>
          A trellis doesn&apos;t grow the tree. It shows each branch where to go, one tier at a time.
        </figcaption>
      </figure>
    </section>
  );
}

// ------------------------------------------------------------ start: a card lying on the page

function Start() {
  const signedIn = useStore().mode === "live";
  return (
    <section className={styles.start} data-section aria-labelledby="start-title">
      <p className={styles.startAside} data-rise>
        {signedIn
          ? "You're signed in. Your map is where you left it."
          : "Signing up takes a minute. Sorting the big topics into know, shaky and new takes one more, and then your map is drawn."}
      </p>
      <div className={styles.startCard} data-rise>
        <h2 id="start-title" className={styles.startTitle}>
          {signedIn ? "Back to your map" : "Start your map"}
        </h2>
        <p>{signedIn ? "Pick up at the topic it marked next." : "Pick React Native or Redis, and say what you want to build."}</p>
        <Link href={signedIn ? "/map" : "/signup"} className={styles.startAction}>
          {signedIn ? "Open your map" : "Create a free account"}
        </Link>
        {!signedIn && (
          <Link href="/map" className={styles.startSecond}>
            Or look around the sample student&apos;s map first
          </Link>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ footer

function Footer() {
  const signedIn = useStore().mode === "live";
  return (
    <footer className={styles.footer}>
      <div className={styles.footCols}>
        <div>
          <p className={styles.footHead}>Trellis</p>
          <p>A study map.</p>
          <p>It never teaches.</p>
        </div>
        <div>
          <p className={styles.footHead}>Product</p>
          <a href="#stuck-title">How it works</a>
          {signedIn ? (
            <Link href="/map">Your map</Link>
          ) : (
            <>
              <Link href="/map">The sample map</Link>
              <Link href="/login">Log in</Link>
              <Link href="/signup">Start your map</Link>
            </>
          )}
        </div>
        <div>
          <p className={styles.footHead}>Subjects</p>
          {subjects.map((s) => (
            <p key={s.id}>{s.name}</p>
          ))}
          <a href={SOURCE.url} target="_blank" rel="noreferrer">
            Topics adapted from {SOURCE.name}
          </a>
        </div>
        <div>
          <p className={styles.footHead}>Promises</p>
          <p>Your record is private</p>
          <p>Delete everything, any time</p>
          <p>No streaks, no guilt</p>
        </div>
      </div>

      <div className={styles.footBottom}>
        <FootWord />
        <p className={styles.legal}>© 2026 Trellis. Your record is yours.</p>
      </div>
    </footer>
  );
}

/** The name at the full width of the page: the SVG's viewBox is fitted to the word once it is drawn. */
function FootWord() {
  const svg = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState("0 0 1000 230");
  useEffect(() => {
    const fitWord = () => {
      const text = svg.current?.querySelector("text");
      if (!text) return;
      const b = text.getBBox();
      setBox(`${b.x} ${b.y + b.height * 0.2} ${b.width} ${b.height * 0.72}`);
    };
    fitWord();
    document.fonts?.ready.then(fitWord);
  }, []);
  return (
    <svg ref={svg} className={styles.footWord} viewBox={box} role="img" aria-label="Trellis">
      <text x="0" y="0">
        Trellis
      </text>
    </svg>
  );
}
