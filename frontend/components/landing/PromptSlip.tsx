"use client";

// The prompt, shown as what it is: a slip of text assembled from three places, with no AI
// writing any of it. The text is buildPrompt() for the sample student's stuck topic, the
// exact prompt the app would hand over (see ./sample.ts).
//
// Pointing at one of the three sources lights up the part of the slip that came from it.
// The Copy button and the two links work: a visitor can take this prompt to their own AI
// and see what the product produces before signing up.

import { useState } from "react";
import { chatGptUrl, claudeUrl } from "@shared/prompt";
import { prompt, stuckTopic } from "./sample";
import styles from "./landing.module.css";

type Part = "known" | "experiences" | "instructions";

const SOURCES: { part: Part; name: string; text: string }[] = [
  { part: "known", name: "Your map", text: "What you have done, what you are shaky on, and the topic that may be why you are stuck." },
  { part: "experiences", name: "Your own words", text: "What you said was hard here, and what made the topics underneath click." },
  { part: "instructions", name: "Fixed instructions", text: "How to teach this topic and this kind of stuck. The same lines for everyone." },
];

export function PromptSlip() {
  const [lit, setLit] = useState<Part | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard is blocked (an old browser, or a page not served over https).
      // The text on the slip can still be selected by hand, so there is nothing to recover.
    }
  };

  return (
    <section className={styles.prompt} data-section aria-labelledby="prompt-title">
      <div className={styles.promptText}>
        <h2 id="prompt-title" className={styles.h2} data-rise>
          Your AI teaches. Trellis writes the prompt.
        </h2>
        <p className={styles.lead} data-rise>
          It never explains {stuckTopic.name}. It puts together what your AI needs to know about you, from three places,
          and no model writes a word of it.
        </p>
        <ul className={styles.sources}>
          {SOURCES.map((s) => (
            <li key={s.part} data-rise>
              <button
                type="button"
                className={styles.source}
                data-part={s.part}
                aria-pressed={lit === s.part}
                onPointerEnter={() => setLit(s.part)}
                onPointerLeave={() => setLit(null)}
                onFocus={() => setLit(s.part)}
                onBlur={() => setLit(null)}
                onClick={() => setLit(s.part)}
              >
                <span className={styles.sourceName}>{s.name}</span>
                <span className={styles.sourceText}>{s.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.slip} data-ui data-lit={lit ?? undefined} data-rise>
        <p className={styles.slipHead}>Prompt for {stuckTopic.name}</p>
        <p data-part="known">{prompt.known}</p>
        <div data-part="experiences">
          <p>From my own notes:</p>
          <ul>
            {prompt.experiences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div data-part="instructions">
          <p>How I&apos;d like you to help:</p>
          <ul>
            {prompt.instructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className={styles.slipActions}>
          <button type="button" className={styles.slipCopy} onClick={copy}>
            {copied ? "Copied" : "Copy the prompt"}
          </button>
          <a href={chatGptUrl(prompt.text)} target="_blank" rel="noreferrer">
            Open in ChatGPT
          </a>
          <a href={claudeUrl(prompt.text)} target="_blank" rel="noreferrer">
            Open in Claude
          </a>
        </div>
      </div>
    </section>
  );
}
