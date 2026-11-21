// The topic sheet (the web's Rail.tsx: TopicPanel and BigPanel), sliding up over the map as a
// native bottom sheet (presentation "formSheet" in (app)/_layout.tsx). Drag down to close.
//
// Got it / Partly / Stuck don't save anything here: they go to the helper, which shows a
// confirm card first, exactly as on the web (design.md §7: nothing is saved without Save).

import { instructions } from "@shared/data/instructions";
import { isBig, kids, subjectById, topicById } from "@shared/data";
import { helpsOf, importanceOf, neededBy, needsOf, nextTopic, pastUnlocks, progressOf, requiredFor, revealed, shortDate, sortByRoute, statusOf, suspectsFor } from "@shared/graph";
import { buildPrompt } from "@shared/prompt";
import type { Outcome, Topic } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { PromptCard } from "@/topic/PromptCard";
import { Section, TopicRows, Verdict } from "@/topic/parts";
import { TopicDiagram } from "@/topic/TopicDiagram";
import { useStore } from "@/store/store";
import { useTheme } from "@/theme/theme";
import { Button } from "@/ui/Button";
import { DifficultyTag } from "@/ui/Difficulty";
import { Segmented } from "@/ui/Segmented";
import { StatusMark, StatusPill } from "@/ui/Status";
import { Tag } from "@/ui/Tag";
import { T } from "@/ui/Text";

const KIND_LABEL = { easy: "Felt easy", hard: "Was hard", clicked: "Made it click" } as const;
const OUTCOME_WORD = { got: "done", partly: "partly", stuck: "stuck" } as const;

export default function TopicScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const topic = topicById.get(id ?? "");
  if (!topic) return null;
  return isBig(topic) ? <BigTopic topic={topic} /> : <SubTopic topic={topic} />;
}

/** Another topic opens in the same sheet (it replaces this one), so Back goes to the map. */
const openTopic = (id: string) => router.setParams({ id });

function Head({ topic, kicker, meta }: { topic: Topic; kicker: React.ReactNode; meta: string }) {
  const { statuses, goal } = useStore();
  const importance = goal ? importanceOf(topic.id, goal, requiredFor(goal)) : null;
  return (
    <View style={styles.head}>
      {kicker}
      <T size="title" weight={600}>
        {topic.name}
      </T>
      <View style={styles.pills}>
        <StatusPill status={statusOf(statuses, topic.id)} />
        <DifficultyTag level={topic.difficulty} />
        {topic.optional && <Tag label="Optional" />}
        <T size="small" tone="muted">
          {meta}
        </T>
      </View>
      <T size="lede">{topic.summary}</T>
      {importance && <Verdict importance={importance} />}
    </View>
  );
}

function SubTopic({ topic }: { topic: Topic }) {
  const { statuses, checkIns, experiences } = useStore();
  const { c } = useTheme();
  const status = statusOf(statuses, topic.id);
  const prompt = buildPrompt(topic, statuses, checkIns, experiences, instructions);
  const suspects = status === "stuck" ? suspectsFor(topic.id, statuses, checkIns, experiences) : [];
  const said = experiences.filter((e) => e.topicId === topic.id).sort((a, b) => b.at.localeCompare(a.at));
  const history = checkIns.filter((x) => x.topicId === topic.id).sort((a, b) => b.at.localeCompare(a.at));
  const unlock = pastUnlocks(checkIns, experiences).at(-1);
  const parent = topicById.get(topic.parentId!)!;

  const log = (outcome: Outcome) => router.navigate({ pathname: "/helper", params: { tap: outcome, topic: topic.id } });

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Head
        topic={topic}
        meta={`${subjectById.get(topic.subjectId)!.shortName} · ~${topic.minutes} min`}
        kicker={<Button kind="ghost" size="small" label={parent.name} onPress={() => openTopic(parent.id)} style={styles.crumb} />}
      />

      {status === "stuck" && suspects.length > 0 && (
        <Section title="May be underneath" tone="stuck">
          <TopicRows ids={suspects.slice(0, 2).map((s) => s.topic.id)} statuses={statuses} onOpen={openTopic} />
          {suspects.slice(0, 2).some((s) => s.path.length > 2) && <T size="small" tone="stuckInk">One of these is two steps down.</T>}
          {unlock && (
            <T size="small" tone="stuckInk">
              Going back one step worked before: {unlock.via.name} → {unlock.stuckOn.name}.
            </T>
          )}
        </Section>
      )}

      <Section title="Your prompt">
        <PromptCard key={topic.id} prompt={prompt} topicId={topic.id} />
      </Section>

      <Section title="How did it go?">
        <Segmented
          stretch
          value={null}
          onChange={log}
          options={[
            { value: "got", label: "Got it", mark: <StatusMark status="done" size={8} /> },
            { value: "partly", label: "Partly", mark: <StatusMark status="learning" size={8} /> },
            { value: "stuck", label: "Stuck", mark: <StatusMark status="stuck" size={8} /> },
          ]}
        />
        <T size="small" tone="muted">
          The helper asks one question, then shows what it will save.
        </T>
      </Section>

      <Section title="Where it sits">
        <TopicDiagram topicId={topic.id} needs={needsOf(topic.id)} unlocks={neededBy(topic.id)} statuses={statuses} />
      </Section>

      <Section title="It needs">
        <TopicRows ids={needsOf(topic.id)} statuses={statuses} onOpen={openTopic} empty="Nothing inside this subject. Start here." />
      </Section>
      {helpsOf(topic.id).length > 0 && (
        <Section title="Helped by (optional)">
          <TopicRows ids={helpsOf(topic.id)} statuses={statuses} onOpen={openTopic} />
        </Section>
      )}

      <Section title="What you said about it">
        {said.length ? (
          said.map((e) => (
            <View key={e.id} style={{ gap: 2 }}>
              <T size="small" tone="muted">
                <T size="small" weight={600} tone={e.kind === "hard" ? "stuckInk" : e.kind === "clicked" ? "doneInk" : "learningInk"}>
                  {KIND_LABEL[e.kind]}
                </T>{" "}
                · {shortDate(e.at)}
              </T>
              <T>“{e.text}”</T>
            </View>
          ))
        ) : (
          <T tone="muted">Nothing yet. Tell the helper how it went and it collects here, then shapes your prompts.</T>
        )}
        {history.length > 0 && (
          <T size="small" tone="muted">
            {history.map((x) => `${shortDate(x.at)} ${OUTCOME_WORD[x.outcome]}`).join(" · ")}
          </T>
        )}
      </Section>

      <Section title="Where people slip">
        {topic.mistakes.map((m) => (
          <T key={m}>• {m}</T>
        ))}
      </Section>

      {neededBy(topic.id).length > 0 && (
        <Section title="It unlocks">
          <TopicRows ids={neededBy(topic.id)} statuses={statuses} onOpen={openTopic} />
        </Section>
      )}
    </ScrollView>
  );
}

function BigTopic({ topic }: { topic: Topic }) {
  const { statuses, checkIns, experiences, opened, goal, act } = useStore();
  const { c } = useTheme();
  const status = statusOf(statuses, topic.id);
  const p = progressOf(topic.id, statuses);
  const inside = sortByRoute(kids(topic.id));
  const next = goal ? nextTopic(goal, statuses) : null;
  const shown = revealed(topic.subjectId, statuses, checkIns, next?.id ?? null, opened, experiences).has(topic.id);

  return (
    <ScrollView style={{ backgroundColor: c.surface }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Head
        topic={topic}
        meta={`${p.done} of ${p.total} core topics · ~${Math.round(topic.minutes / 60)} h`}
        kicker={
          <T size="small" weight={600} tone="muted">
            Big topic
          </T>
        }
      />
      <Section title="Inside" count={inside.length}>
        {shown ? (
          <TopicRows ids={inside.map((t) => t.id)} statuses={statuses} onOpen={openTopic} />
        ) : (
          <View style={{ gap: 12 }}>
            <T tone="muted">
              {inside.length} topics are inside.{" "}
              {status === "know"
                ? "You said you know this, so it stays closed. Open it to check a part you're unsure of."
                : "They appear on your map when you reach this: when the next topic is in here, or you check in on one of them."}
            </T>
            <Button label="Look inside now" onPress={() => void act.open(topic.id)} haptic="light" />
          </View>
        )}
      </Section>
      <Section title="Where it sits">
        <TopicDiagram topicId={topic.id} needs={needsOf(topic.id)} unlocks={neededBy(topic.id)} statuses={statuses} />
      </Section>
      <Section title="It needs">
        <TopicRows ids={needsOf(topic.id)} statuses={statuses} onOpen={openTopic} empty="Nothing. It's where the subject starts." />
      </Section>
      {helpsOf(topic.id).length > 0 && (
        <Section title="Helped by (optional)">
          <TopicRows ids={helpsOf(topic.id)} statuses={statuses} onOpen={openTopic} />
        </Section>
      )}
      {neededBy(topic.id).length > 0 && (
        <Section title="It unlocks">
          <TopicRows ids={neededBy(topic.id)} statuses={statuses} onOpen={openTopic} />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { padding: 20, paddingTop: 24, gap: 10 },
  crumb: { alignSelf: "flex-start", paddingHorizontal: 0, height: 28 },
  pills: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
});
