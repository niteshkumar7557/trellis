import type { DropdownOption } from "@/components/ui/Dropdown";
import { bigTopicsOf, kids, subjects } from "@shared/data";
import type { SubjectId } from "@shared/types";

/**
 * Every subtopic as dropdown options, grouped by big topic, with one subject's first.
 * Check-ins always land on a subtopic, so big topics are only headings here.
 */
export function topicOptions(first: SubjectId): DropdownOption<string>[] {
  const ordered = [...subjects].sort((a, b) => (a.id === first ? -1 : b.id === first ? 1 : 0));
  return ordered.flatMap((s) =>
    bigTopicsOf(s.id).flatMap((big) =>
      kids(big.id).map((t) => ({ value: t.id, label: t.name, group: `${s.shortName} · ${big.name}` })),
    ),
  );
}
