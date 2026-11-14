"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MiniMap } from "@/components/map/MiniMap";
import { Icon } from "@/components/ui/Icon";
import ui from "@/components/ui/ui.module.css";
import { SOURCE, bigTopicsOf, goalsOf, subjects, subtopicsOf } from "@shared/data";
import { requiredFor } from "@shared/graph";
import { useStore } from "@/lib/store";
import type { Subject, SubjectId } from "@shared/types";
import styles from "./start.module.css";

export default function StartPage() {
  const { mode } = useStore();
  // Wait until the store knows who this is: which subjects are already started decides
  // what this page lists, and before that every student looks like one with no goals.
  if (mode === "loading") return <div aria-busy="true" aria-label="Loading" />;
  return <Start />;
}

function Start() {
  const { subjectId: current, goalIds } = useStore();
  // Only subjects the student hasn't started: this page starts a subject, and changing the
  // goal of one already started happens on its map. The list is fixed when the page opens,
  // because "Sort the big topics" starts the chosen subject before moving on, and it
  // shouldn't vanish from the list in the moment between.
  const [fresh] = useState(() => subjects.filter((s) => !goalIds[s.id]));
  const startedAny = fresh.length < subjects.length;

  if (!fresh.length) {
    return (
      <div className={styles.pick}>
        <div className={styles.pickMain}>
          <h1 className={styles.h1}>You&rsquo;ve started every subject</h1>
          <p className={styles.lede}>
            Trellis has reviewed maps for {subjects.map((s) => s.name).join(" and ")} so far, and they&rsquo;re all on your map.
            Tell us what you&rsquo;d like next.
          </p>
          <RequestSubject />
        </div>
      </div>
    );
  }
  // Preselect the subject the student came for (the sidebar or search set it), if it is new.
  const first = fresh.find((s) => s.id === current)?.id ?? fresh[0].id;
  return <PickSubject fresh={fresh} first={first} startedAny={startedAny} />;
}

function PickSubject({ fresh, first, startedAny }: { fresh: Subject[]; first: SubjectId; startedAny: boolean }) {
  const router = useRouter();
  const { statuses, act } = useStore();
  const [subjectId, setSubjectId] = useState<SubjectId>(first);
  const [goalId, setGoalId] = useState<string>(goalsOf(first)[0].id);

  const goal = goalsOf(subjectId).find((g) => g.id === goalId) ?? goalsOf(subjectId)[0];
  const required = useMemo(() => requiredFor(goal), [goal]);
  const subs = subtopicsOf(subjectId);
  const bigs = bigTopicsOf(subjectId);
  const toLearn = subs.filter((t) => required.has(t.id)).length;
  const areas = bigs.filter((t) => required.has(t.id)).length;

  return (
    <div className={styles.pick}>
      <div className={styles.pickMain}>
        <h1 className={styles.h1}>{startedAny ? "What else are you learning?" : "What are you learning?"}</h1>
        <p className={styles.lede}>Pick a subject and what you want to be able to do. Trellis works out the rest of the route.</p>

        <fieldset className={styles.subjects}>
          <legend className="visually-hidden">Subject</legend>
          {fresh.map((s) => (
            <label key={s.id} className={styles.subjectCard} data-on={s.id === subjectId || undefined}>
              <input
                type="radio"
                name="subject"
                value={s.id}
                checked={s.id === subjectId}
                onChange={() => {
                  setSubjectId(s.id);
                  setGoalId(goalsOf(s.id)[0].id);
                }}
              />
              <span className={styles.subjectName}>{s.name}</span>
              <span className={styles.subjectBlurb}>{s.blurb}</span>
              <span className={`${styles.subjectMeta} num`}>
                {bigTopicsOf(s.id).length} big topics · {subtopicsOf(s.id).length} inside
              </span>
            </label>
          ))}
        </fieldset>

        <RequestSubject />

        <fieldset className={styles.goals}>
          <legend className={styles.legend}>Your goal</legend>
          {goalsOf(subjectId).map((g) => {
            const req = requiredFor(g);
            const n = subs.filter((t) => req.has(t.id)).length;
            return (
              <label key={g.id} className={styles.goalRow} data-on={g.id === goal.id || undefined}>
                <input type="radio" name="goal" value={g.id} checked={g.id === goal.id} onChange={() => setGoalId(g.id)} />
                <span className={styles.goalText}>
                  <span className={styles.goalName}>{g.name}</span>
                  <span className={styles.goalBlurb}>{g.blurb}</span>
                </span>
                <span className={`${styles.goalFig} num`}>
                  {n}
                  <span> of {subs.length}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className={styles.footer}>
          <button
            type="button"
            className={ui.primary}
            onClick={async () => {
              await act.setGoal(subjectId, goal.id);
              router.push("/start/sort");
            }}
          >
            Sort the big topics
            <Icon name="forward" />
          </button>
          <span className={styles.footNote}>
            <span className="num">{areas}</span> cards, about a minute. You can change your goal any time.
          </span>
        </div>
      </div>

      <aside className={styles.preview} aria-label="This goal on the map">
        <p className={styles.previewFigure}>
          <span className="num">{toLearn}</span> topics to learn
          <br />
          <span className="num">{subs.length - toLearn}</span> you can skip
        </p>
        <MiniMap subjectId={subjectId} required={required} statuses={statuses} animateKey={goal.id} width={440} height={340} className={styles.mini} />
        <p className={styles.previewNote}>
          Each dot is a big topic. Dark: what this goal needs; green where you&apos;ve already done it. Pale: what it
          doesn&apos;t need. Your map starts small: a big topic opens into its smaller topics when you reach it.
        </p>
        <p className={styles.previewNote}>
          Topics adapted from{" "}
          <a href={`${SOURCE.url}/${subjectId}`} target="_blank" rel="noreferrer">
            {SOURCE.name}
          </a>
          .
        </p>
      </aside>
    </div>
  );
}

/** "Learning something else?": the subject is saved as a request, and the answer is "Coming soon". */
function RequestSubject() {
  const { act } = useStore();
  const [other, setOther] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  return (
    <form
      className={styles.other}
      onSubmit={(e) => {
        e.preventDefault();
        if (!other.trim()) return;
        setAsked(other.trim());
        void act.requestSubject(other.trim());
      }}
    >
      <label htmlFor="other-subject" className={styles.otherLabel}>
        Learning something else?
      </label>
      <div className={styles.otherRow}>
        <input
          id="other-subject"
          autoComplete="off"
          value={other}
          placeholder="For example: Kubernetes, linear algebra"
          onChange={(e) => {
            setOther(e.target.value);
            setAsked(null);
          }}
        />
        <button type="submit" className={ui.btn} disabled={!other.trim()}>
          Ask
        </button>
      </div>
      {asked && (
        <p className={styles.otherReply} role="status">
          <strong>Coming soon.</strong> Trellis has reviewed maps for React Native and Redis only, for now. A map
          for “{asked}” isn&apos;t ready yet.
        </p>
      )}
    </form>
  );
}
