// The map on a phone (docs/mobile.md §5): the route as a list, foundations first, and the
// stuck finding with its likely cause. Run on the sample student, who is stuck on FlatList
// (the same student the site's landing page shows).

import { goalById, topicById } from "@shared/data";
import { sampleCheckIns, sampleClaims, sampleExperiences, student, TODAY } from "@shared/data/student";
import { deriveStatuses, statusOf, summarise, suspectsFor } from "@shared/graph";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Findings } from "@/map/Findings";
import { RouteList } from "@/map/RouteList";
import { ThemeProvider } from "@/theme/theme";

const goal = goalById.get(student.goals.find((g) => g.subjectId === "react-native")!.goalId)!;
const statuses = deriveStatuses(sampleClaims, sampleCheckIns);
const summary = summarise(goal, statuses);
const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe("RouteList", () => {
  it("lists the goal's big topics in learning order, then the ones it doesn't need", async () => {
    await wrap(<RouteList summary={summary} statuses={statuses} open={new Set()} nextId={null} onOpen={jest.fn()} />);
    expect(screen.getByText("Your route")).toBeTruthy();
    const names = screen.getAllByTestId("area-name").map((n) => n.props.children);
    expect(names.slice(0, summary.areas.length)).toEqual(summary.areas.map((a) => a.name));
    expect(screen.getByText("Not needed for this goal")).toBeTruthy();
  });

  it("shows an open big topic's subtopics, and marks the next one", async () => {
    const area = summary.areas[0]!;
    const sub = summary.route.find((t) => t.parentId === area.id)!;
    const onOpen = jest.fn();
    await wrap(<RouteList summary={summary} statuses={statuses} open={new Set([area.id])} nextId={sub.id} onOpen={onOpen} />);
    expect(screen.getByText("Next")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(new RegExp(`^${sub.name}`)));
    expect(onOpen).toHaveBeenCalledWith(sub.id);
  });
});

describe("Findings", () => {
  it("says what you're stuck on and what may be underneath", async () => {
    const stuck = summary.route.find((t) => statusOf(statuses, t.id) === "stuck")!;
    const suspects = suspectsFor(stuck.id, statuses, sampleCheckIns, sampleExperiences);
    await wrap(
      <Findings stuck={stuck} suspect={suspects[0]?.topic ?? null} checkIns={sampleCheckIns} today={TODAY} next={null} statuses={statuses} onOpen={jest.fn()} />,
    );
    expect(screen.getByText(`Stuck: ${topicById.get(stuck.id)!.name}`)).toBeTruthy();
    expect(screen.getByText(new RegExp(`may be ${suspects[0]!.topic.name}`))).toBeTruthy();
  });
});
