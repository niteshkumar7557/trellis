import { bigTopicsOf, kids, subjects } from "@/lib/data";
import type { SubjectId } from "@/lib/types";

/** Every subtopic, grouped by big topic, with one subject's first. Check-ins always land on a subtopic. */
export function TopicOptions({ first }: { first: SubjectId }) {
  const ordered = [...subjects].sort((a, b) => (a.id === first ? -1 : b.id === first ? 1 : 0));
  return (
    <>
      {ordered.flatMap((s) =>
        bigTopicsOf(s.id).map((big) => (
          <optgroup key={big.id} label={`${s.shortName} · ${big.name}`}>
            {kids(big.id).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        )),
      )}
    </>
  );
}
