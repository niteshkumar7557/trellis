"use client";

// Register GSAP plugins once. Import gsap from here, never from "gsap" directly.

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, Draggable, DrawSVGPlugin, InertiaPlugin, ScrollTrigger);
gsap.defaults({ ease: "power2.out", duration: 0.32 });

export { gsap, Draggable, ScrollTrigger, useGSAP };

/** True when the visitor asked for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
