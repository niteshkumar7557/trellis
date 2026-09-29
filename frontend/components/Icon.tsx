// Shared icon additions needed by app pages.
// Add new icons here as needed — do not remove existing ones.
import type { ReactNode } from "react";

const ICON_PATHS = {
	plus: (
		<>
			<path d="M12 5v14M5 12h14" />
		</>
	),
	search: (
		<>
			<circle cx="10.8" cy="10.8" r="6.8" />
			<path d="m16 16 4.2 4.2" />
		</>
	),
	send: (
		<>
			<path d="m21 3-7.2 18-3.8-8L2 9.2 21 3Z" />
			<path d="M10 13 21 3" />
		</>
	),
	paperclip: (
		<path d="m20.5 11.5-8.9 8.9a5 5 0 0 1-7.1-7.1l9.7-9.7a3.5 3.5 0 1 1 5 5l-9.7 9.7a2 2 0 0 1-2.8-2.8l8.9-8.9" />
	),
	menu: (
		<>
			<path d="M4 7h16M4 12h16M4 17h16" />
		</>
	),
	sparkle: (
		<>
			<path d="m12 3-1.3 5.3L5 10l5.7 1.7L12 17l1.3-5.3L19 10l-5.7-1.7L12 3Z" />
			<path d="m19 16-.5 2.5L16 19l2.5.5L19 22l.5-2.5L22 19l-2.5-.5L19 16Z" />
		</>
	),
	sun: (
		<>
			<circle cx="12" cy="12" r="3.5" />
			<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
		</>
	),
	moon: (
		<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />
	),
	sidebar: (
		<>
			<rect x="3" y="4" width="18" height="16" rx="2" />
			<path d="M9 4v16M13 9h5M13 12h5M13 15h5" />
		</>
	),
	arrowDown: (
		<>
			<path d="M12 5v14" />
			<path d="m6 13 6 6 6-6" />
		</>
	),
	arrowRight: (
		<>
			<path d="M5 12h14" />
			<path d="m13 6 6 6-6 6" />
		</>
	),
	arrowLeft: (
		<>
			<path d="M19 12H5" />
			<path d="m11 18-6-6 6-6" />
		</>
	),
	mail: (
		<>
			<rect x="3" y="5" width="18" height="14" rx="2" />
			<path d="m3.5 7 8.5 6 8.5-6" />
		</>
	),
	lock: (
		<>
			<rect x="4.5" y="10.5" width="15" height="10" rx="2" />
			<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
		</>
	),
	user: (
		<>
			<circle cx="12" cy="8" r="3.6" />
			<path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
		</>
	),
	eye: (
		<>
			<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
			<circle cx="12" cy="12" r="3" />
		</>
	),
	eyeOff: (
		<>
			<path d="m4 4 16 16" />
			<path d="M9.9 5.2A9.5 9.5 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.2 3.9" />
			<path d="M6.6 7.2A17 17 0 0 0 2.5 12s3.5 6.2 9.5 6.2a9.3 9.3 0 0 0 3.6-.7" />
			<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
		</>
	),
	check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
	alert: (
		<>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 8v5" />
			<path d="M12 16h.01" />
		</>
	),
	chevronDown: <path d="m6 9 6 6 6-6" />,
	chevronRight: <path d="m9 6 6 6-6 6" />,
	// App-specific icons added below
	book: (
		<>
			<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
		</>
	),
	target: (
		<>
			<circle cx="12" cy="12" r="9" />
			<circle cx="12" cy="12" r="5" />
			<circle cx="12" cy="12" r="1" />
		</>
	),
	graph: (
		<>
			<circle cx="5" cy="12" r="2" />
			<circle cx="19" cy="5" r="2" />
			<circle cx="19" cy="19" r="2" />
			<path d="m6.9 10.7 10.2-4.4" />
			<path d="m6.9 13.3 10.2 4.4" />
		</>
	),
	calendar: (
		<>
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<path d="M16 2v4M8 2v4M3 10h18" />
		</>
	),
	bell: (
		<>
			<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
			<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
		</>
	),
	pause: (
		<>
			<rect x="6" y="4" width="4" height="16" rx="1" />
			<rect x="14" y="4" width="4" height="16" rx="1" />
		</>
	),
	trash: (
		<>
			<path d="M3 6h18" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		</>
	),
	copy: (
		<>
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</>
	),
	externalLink: (
		<>
			<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
			<path d="M15 3h6v6" />
			<path d="m10 14 11-11" />
		</>
	),
	settings: (
		<>
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
		</>
	),
	home: (
		<>
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</>
	),
	zap: (
		<>
			<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
		</>
	),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
	name: IconName;
	size?: number;
}

export default function Icon({ name, size = 18 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{ICON_PATHS[name]}
		</svg>
	);
}
