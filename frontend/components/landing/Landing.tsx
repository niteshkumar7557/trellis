"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Espalier } from "@/components/art/Espalier";
import { Mark } from "@/components/ui/Mark";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import styles from "./landing.module.css";

// The landing page is dressed as a gardener's plate book: a trellis trains a fruit
// tree branch by branch, the way Trellis trains a subject topic by topic.

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The plate draws itself: trunk, then the trained arms, then the spurs.
        const plate = root.current!.querySelector("[data-hero-plate]")!;
        const grow = gsap.timeline({ defaults: { ease: "power2.inOut" } });
        grow
          .from(plate.querySelectorAll("[data-layer='bare'] [data-grow='trunk']"), { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9 })
          .from(plate.querySelectorAll("[data-layer='bare'] [data-grow='arm']"), { drawSVG: "0%", duration: 0.9, stagger: 0.04 }, "-=0.35")
          .from(plate.querySelectorAll("[data-layer='bare'] [data-grow='spur']"), { drawSVG: "0%", duration: 0.4, stagger: 0.01 }, "-=0.5")
          .from(plate.querySelectorAll("[data-part='trellis'] path"), { opacity: 0, duration: 0.6 }, 0.2);

        // Signature: the seasons turn slowly — bare wood, leaf, fruit — and back.
        const seasons = gsap.utils.toArray<SVGGElement>(plate.querySelectorAll("[data-season]"));
        gsap.set(seasons.slice(1), { opacity: 0 });
        const turn = gsap.timeline({ repeat: -1, delay: 2.6 });
        seasons.forEach((_, i) => {
          const next = seasons[(i + 1) % seasons.length];
          turn.to(next, { opacity: 1, duration: 1.6, ease: "sine.inOut" }, "+=5.5");
          turn.to(seasons[i], { opacity: 0, duration: 1.6, ease: "sine.inOut" }, "<");
        });
        const onVis = () => (document.hidden ? turn.pause() : turn.resume());
        document.addEventListener("visibilitychange", onVis);

        // The plate drifts a little as the hero scrolls away.
        gsap.to(plate, {
          yPercent: -8,
          scale: 0.96,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom top", scrub: true },
        });

        // Every section's parts rise in once, heading first.
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

        // The how-it-works cards step up one after another.
        gsap.from("[data-step-card]", {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-steps]", start: "top 70%", once: true },
        });

        return () => document.removeEventListener("visibilitychange", onVis);
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const plate = root.current!.querySelector("[data-hero-plate]")!;
        const seasons = plate.querySelectorAll("[data-season]");
        gsap.set(seasons, { opacity: 0 });
        gsap.set(seasons[seasons.length - 1], { opacity: 1 });
      });

      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.page}>
      <Hero />
      <main>
        <Showcase />
        <HowItWorks />
        <TopicPlate />
        <WontDo />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}

// ------------------------------------------------------------ hero

function Hero() {
  return (
    <section className={styles.hero} data-hero aria-labelledby="hero-title">
      <header className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          <Mark size={20} />
          Trellis
        </Link>
        <nav className={styles.navLinks} aria-label="Site">
          <a href="#how">How it works</a>
          <Link href="/login">Log in</Link>
        </nav>
      </header>

      <figure className={styles.plate} data-hero-plate>
        <div className={styles.plateArt}>
          <div className={styles.season} data-season="bare">
            <Espalier layers={["bare"]} seed={7} title="The espalier in winter: bare trained wood" />
          </div>
          <div className={styles.season} data-season="leaf">
            <Espalier layers={["bare", "leaf"]} seed={7} title="The espalier in leaf" />
          </div>
          <div className={styles.season} data-season="fruit">
            <Espalier layers={["bare", "leaf", "fruit"]} seed={7} ripeness={0.62} title="The espalier in fruit" />
          </div>
        </div>
        <figcaption>A pear trained along wires, one tier at a time.</figcaption>
      </figure>

      <h1 id="hero-title" className={styles.heroTitle}>
        The map of what you&apos;re learning.
      </h1>
      <p className={styles.heroSub}>
        It starts with the big topics and opens the smaller ones as you reach them. It shows what to study next, what you
        can skip, and the earlier topic that is really why you&apos;re stuck. Then it writes the prompt for your own AI.
      </p>
      <div className={styles.heroRow}>
        <span>React Native · Redis</span>
        <Link href="/signup" className={styles.heroAction}>
          Start your map
        </Link>
        <span>Free · private · no streaks</span>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ showcase: one control, blown up

const STATES = {
  got: {
    word: "well",
    label: "Got it",
    line: "The topic turns green on your map, and the next one lights up. Nothing else to fill in.",
  },
  partly: {
    word: "halfway",
    label: "Partly",
    line: "It stays on your route, and what you wrote is kept, so the next prompt starts where you stopped.",
  },
  stuck: {
    word: "nowhere",
    label: "Stuck",
    line: "Trellis looks up to two steps back for the topic that is really in the way, and writes you a prompt for that instead.",
  },
} as const;
type Said = keyof typeof STATES;

function Showcase() {
  const [said, setSaid] = useState<Said>("stuck");
  const word = useRef<HTMLSpanElement>(null);

  const choose = (s: Said) => {
    setSaid(s);
    if (word.current && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(word.current, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
    }
  };

  return (
    <section className={styles.showcase} data-said={said} data-section aria-labelledby="showcase-title">
      <div className={styles.showcaseText}>
        <h2 id="showcase-title" className={styles.h2} data-rise>
          It went{" "}
          <span ref={word} className={styles.word}>
            {STATES[said].word}
          </span>
          .
        </h2>
        <p className={styles.showcaseLine} data-rise aria-live="polite">
          {STATES[said].line}
        </p>
      </div>

      <div className={styles.control} data-ui>
        <div className={styles.controlHead}>
          <span className={styles.controlTopic}>FlatList</span>
          <span className={styles.controlStamp}>Tonight, 22:05</span>
        </div>
        <div className={styles.controlSeg} role="radiogroup" aria-label="How did it go?">
          {(Object.keys(STATES) as Said[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={said === s}
              className={styles.controlBtn}
              onClick={() => choose(s)}
            >
              <span className={styles.controlDot} data-s={s} aria-hidden="true" />
              {STATES[s].label}
            </button>
          ))}
        </div>
        <p className={styles.controlQuote}>“my flatlist doesn&apos;t update when I add an item”</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ how it works: one card, four fields

function StepCard({ step }: { step: 0 | 1 | 2 | 3 }) {
  const pill = [
    { s: "new", t: "New" },
    { s: "stuck", t: "Stuck" },
    { s: "stuck", t: "Stuck" },
    { s: "done", t: "Done" },
  ][step];
  return (
    <div className={styles.stepCard} data-ui data-step-card>
      <span className={styles.stepPill} data-s={pill.s}>
        {pill.t}
      </span>
      <p className={styles.stepName}>FlatList</p>
      {step === 0 && (
        <>
          <p className={styles.stepMeta}>Needs ScrollView, Props, State</p>
          <p className={styles.stepMeta}>About an hour</p>
        </>
      )}
      {step === 1 && (
        <>
          <p className={styles.stepQuote}>“my flatlist doesn&apos;t update when I add an item”</p>
          <p className={styles.stepMeta}>Tuesday, 22:05</p>
        </>
      )}
      {step === 2 && (
        <>
          <p className={styles.stepQuote}>
            May be underneath: <strong>State</strong>. You said React basics was shaky.
          </p>
          <span className={styles.stepButton}>Copy the prompt</span>
        </>
      )}
      {step === 3 && (
        <>
          <p className={styles.stepQuote}>What made it click: “a new array, not the old one pushed into”</p>
          <p className={styles.stepMeta}>Friday, 21:40</p>
        </>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    "First it’s a name on your map.",
    "Then you say you got nowhere.",
    "Then Trellis looks two steps back.",
    "Then it clicks, and it’s remembered.",
  ];
  return (
    <section id="how" className={styles.howWrap} data-section aria-labelledby="how-title">
      <div className={styles.howHead}>
        <h2 id="how-title" className={styles.h2} data-rise>
          Stuck, then unstuck
        </h2>
        <p className={styles.howIntro} data-rise>
          One topic over four evenings. Trellis never explains lists; it finds what was really in the way.
        </p>
      </div>
      <div className={styles.how} data-steps>
        {steps.map((clause, i) => (
          <div key={clause} className={styles.field} data-field={i}>
            <p className={styles.clause}>{clause}</p>
            <StepCard step={i as 0 | 1 | 2 | 3} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ one topic, opened, with notes in the margins

const NOTES = [
  { side: "left", name: "What it covers", text: "One line on what the topic is about. Never an explanation; that is your AI's job." },
  { side: "right", name: "What's underneath", text: "When you're stuck, the weakest topic it stands on, and what worked for you last time." },
  { side: "left", name: "Your prompt", text: "Written from your map and your own words, so your AI starts where you are." },
  { side: "right", name: "Your own AI", text: "Copy it, or open it straight in ChatGPT or Claude. The learning happens there." },
  { side: "left", name: "How it went", text: "One tap when you're back. Stuck is the most useful thing you can say." },
  { side: "right", name: "Your own words", text: "What confused you and what made it click, kept with the topic for next time." },
] as const;

function TopicPlate() {
  const [active, setActive] = useState<number | null>(null);
  const rows = [
    <div key="0" className={styles.pHead}>
      <p className={styles.pTitle}>FlatList</p>
      <p className={styles.pPills}>
        <span className={styles.stepPill} data-s="stuck">
          Stuck
        </span>
        <span>React Native · Lists · ~60 min</span>
      </p>
      <p className={styles.pSummary}>The list that only renders what&apos;s on screen, fed by data, renderItem and keyExtractor.</p>
    </div>,
    <div key="1" className={styles.pUnder}>
      <p className={styles.pLabel}>May be underneath</p>
      <p className={styles.pRow}>
        <span className={styles.ring} data-s="shaky" /> State <span>Said shaky</span>
      </p>
      <p className={styles.pMemory}>Going back one step worked before: Components → Props.</p>
    </div>,
    <div key="2">
      <p className={styles.pLabel}>Your prompt</p>
      <p className={styles.pPrompt}>
        I&apos;m learning React Native (Lists) and I&apos;m stuck on FlatList — specifically, I push the new item into the
        array and nothing re-renders. I&apos;m comfortable with ScrollView and Props. I think my real gap is State. Start
        there, briefly…
      </p>
    </div>,
    <div key="3" className={styles.pButtons}>
      <span className={styles.pPrimary}>Copy</span>
      <span>ChatGPT ↗</span>
      <span>Claude ↗</span>
    </div>,
    <div key="4">
      <p className={styles.pLabel}>How did it go?</p>
      <p className={styles.pSeg}>
        <span>Got it</span>
        <span>Partly</span>
        <span>Stuck</span>
      </p>
    </div>,
    <div key="5">
      <p className={styles.pLabel}>Your notes</p>
      <p className={styles.pNote}>
        30 Oct · “my flatlist doesn&apos;t update when I add an item”
      </p>
    </div>,
  ];

  return (
    <section className={styles.topic} data-section aria-labelledby="topic-title">
      <h2 id="topic-title" className={`${styles.h2} ${styles.topicTitle}`} data-rise>
        Open any topic
      </h2>
      <div className={styles.topicGrid} data-ui-wrap>
        {rows.map((part, i) => {
          const note = NOTES[i];
          const noteEl = (
            <button
              type="button"
              className={styles.note}
              data-side={note.side}
              aria-pressed={active === i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              data-rise
            >
              <span className={styles.noteName}>{note.name}</span>
              <span className={styles.noteText}>{note.text}</span>
            </button>
          );
          return (
            <div key={i} className={styles.topicRow} data-active={active === i || undefined}>
              <div className={styles.noteCell} data-side="left">
                {note.side === "left" && noteEl}
              </div>
              <div className={styles.panelPart} data-ui data-first={i === 0 || undefined} data-last={i === rows.length - 1 || undefined}>
                {part}
              </div>
              <div className={styles.noteCell} data-side="right">
                {note.side === "right" && noteEl}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ what it won't do: a poster

const WONT = [
  { word: "teach", fact: "your own AI does that" },
  { word: "nag", fact: "no reminders, no streaks" },
  { word: "judge", fact: "stuck is information" },
  { word: "tell", fact: "nobody else sees your record" },
  { word: "forget", fact: "what helped you comes back" },
];

function WontDo() {
  return (
    <section className={styles.wont} data-section aria-labelledby="wont-title">
      <div className={styles.wontHead}>
        <h2 id="wont-title" className={styles.h2} data-rise>
          What it won&apos;t do
        </h2>
        <p className={styles.wontFor} data-rise>
          Made for subjects where one idea stands on another: building apps, running databases, maths, physics. Not for
          memorising, a craft you practise, or an exam next week.
        </p>
      </div>
      <ul className={styles.wontList}>
        {WONT.map((w) => (
          <li key={w.word} data-rise>
            <span className={styles.wontWord}>{w.word}</span>
            <span className={`${styles.wontFact} num`}>{w.fact}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------ call to action: one word is the button

function Cta() {
  return (
    <section className={styles.ctaWrap} aria-labelledby="cta-word">
      <Link href="/signup" className={styles.cta}>
        <span className={styles.ctaLine}>Pick React Native or Redis. Sorting the big topics takes a minute.</span>
        <svg className={styles.ctaArrow} viewBox="0 0 48 48" aria-hidden="true">
          <path d="M12 36 36 12M16 12h20v20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
        </svg>
        <span id="cta-word" className={styles.ctaWord}>
          start
        </span>
      </Link>
    </section>
  );
}

// ------------------------------------------------------------ footer

function Footer() {
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
          <a href="#how">How it works</a>
          <Link href="/login">Log in</Link>
          <Link href="/signup">Start your map</Link>
        </div>
        <div>
          <p className={styles.footHead}>Subjects</p>
          <p>React Native</p>
          <p>Redis</p>
          <p>Topics adapted from roadmap.sh</p>
        </div>
        <div>
          <p className={styles.footHead}>Promises</p>
          <p>Your record is private</p>
          <p>Delete everything, any time</p>
          <p>No streaks, no guilt</p>
        </div>
      </div>

      <div className={styles.footPlates} aria-hidden="true">
        <Espalier className={styles.footPlate} layers={["bare"]} seed={3} tiers={[3, 3, 2, 2]} />
        <Espalier className={styles.footPlate} layers={["bare", "leaf"]} seed={5} tiers={[3, 3, 3, 2]} />
        <Espalier className={styles.footPlate} layers={["bare", "leaf", "fruit"]} seed={9} tiers={[4, 3, 3, 2]} ripeness={0.7} />
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
