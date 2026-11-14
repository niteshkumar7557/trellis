// The picture a link to Trellis shows in WhatsApp, LinkedIn, X and so on: the lockup, the
// one-line promise, and the real React Native map in miniature.
//
// It is drawn here in code and Next renders it to a PNG once, at build time (those apps
// don't show SVG previews; see components/brand/images.tsx for the full reason). The map
// is the app's own layout with the sample student's statuses, so the share picture shows
// the true shape of a subject, not an invented diagram.

import { ImageResponse } from "next/og";
import { BRAND } from "@/components/brand/brand";
import { plexFonts } from "@/components/brand/images";
import { Logo } from "@/components/brand/Logo";
import { layoutFor } from "@/components/map/layout";
import { sampleCheckIns, sampleClaims } from "@shared/data/student";
import { deriveStatuses, statusOf } from "@shared/graph";
import type { Status } from "@shared/types";

export const alt = "Trellis: the map of what you're learning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The status colours of the light theme (app/globals.css), as hex: no CSS variables here.
const FILL: Record<Status, string> = {
  done: "#2b6a3f",
  learning: "#2f6db5",
  stuck: "#c4242a",
  shaky: "#a26a0a",
  know: "#151714",
  new: "#b9beb4",
};

export default async function OpenGraphImage() {
  const layout = layoutFor("react-native", new Set(), "mini");
  const statuses = deriveStatuses(sampleClaims, sampleCheckIns);
  // The paper sheet on the right, and the map scaled to fit inside it.
  const sheet = { w: 500, h: 470, pad: 44 };
  const scale = Math.min((sheet.w - sheet.pad * 2) / layout.width, (sheet.h - sheet.pad * 2) / layout.height);
  const mapW = layout.width * scale;
  const mapH = layout.height * scale;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          padding: 64,
          background: BRAND.charcoal,
          color: BRAND.paper,
          fontFamily: "IBM Plex Sans",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 520 }}>
          <Logo size={44} color={BRAND.leafOnDark} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 70, fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.03em" }}>The map of what you&apos;re learning.</div>
            <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.35, color: BRAND.mist }}>
              What to study next, what you can skip, and why you&apos;re really stuck.
            </div>
          </div>
        </div>

        <div
          style={{
            width: sheet.w,
            height: sheet.h,
            alignSelf: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: BRAND.paper,
          }}
        >
          <svg width={mapW} height={mapH} viewBox={`0 0 ${layout.width} ${layout.height}`}>
            {layout.edges
              .filter((e) => e.kind === "needs")
              .map((e) => (
                <path key={`${e.from}-${e.to}`} d={e.d} fill="none" stroke="#9da398" strokeWidth={1.2 / scale} />
              ))}
            {layout.nodes.map((n) => (
              <rect key={n.topic.id} x={n.x} y={n.y} width={n.w} height={n.h} rx={n.h / 2} fill={FILL[statusOf(statuses, n.topic.id)]} />
            ))}
          </svg>
        </div>
      </div>
    ),
    { ...size, fonts: await plexFonts() },
  );
}
