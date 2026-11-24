// Inline SVG icons (Lucide-style, ISC-licensed shapes) so the package has no icon dependency.
import type { SVGProps } from "react";

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
});

export const CalendarIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

export const ChevronLeftIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg {...base(size)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
