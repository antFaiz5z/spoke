type PlaybackMode = "single" | "repeat-one" | "auto-next";

export function PlayIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-white" : "text-current"}`}>
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M7 6h3v12H7zM14 6h3v12h-3z" fill="currentColor" />
    </svg>
  );
}

export function StepIcon({ direction }: { direction: "prev" | "next" }) {
  const flip = direction === "prev" ? "scale-x-[-1]" : "";
  return (
    <svg viewBox="0 0 24 24" className={`h-4.5 w-4.5 ${flip}`}>
      <path d="M6 6h2v12H6zM10 6.5v11l8-5.5-8-5.5Z" fill="currentColor" />
    </svg>
  );
}

export function TrackModeIcon({ mode }: { mode: PlaybackMode }) {
  if (mode === "repeat-one") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
        <path
          d="M7 7h9l-1.8-2M17 17H8l1.8 2M18 7v4M6 17v-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 9.7h1.7v4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (mode === "auto-next") {
    return (
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
        <path
          d="M4 12h10M10 8l4 4-4 4M15 8l4 4-4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
      <path d="M7 7.5v9l7-4.5-7-4.5Z" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path
        d="M5 12h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MarqueeText({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  if (!animate) {
    return <span className="block truncate">{text}</span>;
  }

  return (
    <div className="spoke-marquee">
      <div className="spoke-marquee-track">
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
