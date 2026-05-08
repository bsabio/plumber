// Geometric flat SVG icons — consistent 24×24 viewBox, filled shapes, no strokes

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

const D = (props: IconProps & { children: React.ReactNode }) => (
  <svg
    width={props.size ?? 24}
    height={props.size ?? 24}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    aria-hidden="true"
  >
    {props.children}
  </svg>
);

// ── Ticket: rectangle with notched circle on the left side
export function TicketIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="2" y="5" width="20" height="14" rx="1" />
      <rect x="8" y="5" width="2" height="14" fill="white" />
      <rect x="11" y="9" width="8" height="2" fill="white" />
      <rect x="11" y="13" width="6" height="2" fill="white" />
    </D>
  );
}

// ── Calendar: grid with header block
export function CalendarIcon(p: IconProps) {
  return (
    <D {...p}>
      {/* body */}
      <rect x="2" y="5" width="20" height="17" rx="1" />
      {/* header bar */}
      <rect x="2" y="5" width="20" height="6" />
      {/* pin tabs */}
      <rect x="7" y="2" width="3" height="5" rx="1" />
      <rect x="14" y="2" width="3" height="5" rx="1" />
      {/* grid dots */}
      <rect x="5" y="15" width="3" height="3" rx="0.5" fill="white" opacity="0.9" />
      <rect x="10.5" y="15" width="3" height="3" rx="0.5" fill="white" opacity="0.9" />
      <rect x="16" y="15" width="3" height="3" rx="0.5" fill="white" opacity="0.9" />
    </D>
  );
}

// ── Check shield: square with bold checkmark
export function ResolveIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <polygon points="6,12 10,16 18,8 16,6 10,12 8,10" fill="white" />
    </D>
  );
}

// ── Person: circle head + rectangular body
export function PersonIcon(p: IconProps) {
  return (
    <D {...p}>
      <circle cx="12" cy="7" r="4" />
      <rect x="4" y="14" width="16" height="8" rx="3" />
    </D>
  );
}

// ── Key: circle + stick + teeth
export function CustomerIcon(p: IconProps) {
  return (
    <D {...p}>
      <circle cx="8" cy="10" r="5" />
      <circle cx="8" cy="10" r="2.5" fill="white" />
      <rect x="12.5" y="9" width="9" height="2.5" rx="1" />
      <rect x="18" y="11.5" width="2.5" height="3" rx="0.5" />
      <rect x="14.5" y="11.5" width="2.5" height="2" rx="0.5" />
    </D>
  );
}

// ── Bolt: lightning polygon
export function AdminIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="13,2 4,13 11,13 11,22 20,11 13,11" />
    </D>
  );
}

// ── Wrench: geometric wrench
export function WrenchIcon(p: IconProps) {
  return (
    <D {...p}>
      {/* handle */}
      <rect x="11" y="8" width="4" height="13" rx="2" transform="rotate(45 13 14)" />
      {/* head circle */}
      <circle cx="6" cy="6" r="4" />
      <circle cx="6" cy="6" r="2" fill="white" />
    </D>
  );
}

// ── Pipe cross-section logo: two overlapping L-pipes
export function PipeLogoIcon(p: IconProps) {
  return (
    <D {...p}>
      {/* horizontal pipe */}
      <rect x="2" y="9" width="20" height="6" rx="1" />
      {/* vertical pipe */}
      <rect x="9" y="2" width="6" height="20" rx="1" />
      {/* center cap */}
      <rect x="9" y="9" width="6" height="6" />
    </D>
  );
}

// ── Document: paper with lines
export function DocumentIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <rect x="7" y="7" width="10" height="2" fill="white" />
      <rect x="7" y="11" width="10" height="2" fill="white" />
      <rect x="7" y="15" width="6" height="2" fill="white" />
    </D>
  );
}

// ── Warning triangle
export function WarningIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="12,2 22,21 2,21" />
      <rect x="11" y="9" width="2" height="6" fill="white" />
      <rect x="11" y="17" width="2" height="2" fill="white" />
    </D>
  );
}

// ── Sign out: rectangle with arrow
export function SignOutIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="2" y="3" width="10" height="18" rx="1" />
      <polygon points="14,8 22,12 14,16" />
      <rect x="12" y="11" width="8" height="2" />
    </D>
  );
}

// ── Sign in: arrow into rectangle
export function SignInIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="12" y="3" width="10" height="18" rx="1" />
      <polygon points="10,8 2,12 10,16" />
      <rect x="4" y="11" width="8" height="2" />
    </D>
  );
}

// ── Close X
export function CloseIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="4,4 8,4 12,8 16,4 20,4 20,8 16,12 20,16 20,20 16,20 12,16 8,20 4,20 4,16 8,12 4,8" />
    </D>
  );
}

// ── Chevron left
export function ChevronLeftIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="15,4 7,12 15,20 17,18 11,12 17,6" />
    </D>
  );
}

// ── Chevron right
export function ChevronRightIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="9,4 17,12 9,20 7,18 13,12 7,6" />
    </D>
  );
}

// ── Send arrow
export function SendIcon(p: IconProps) {
  return (
    <D {...p}>
      <polygon points="2,12 22,4 14,22" />
      <polygon points="2,12 22,4 12,12" fill="white" />
    </D>
  );
}

// ── News/article
export function NewsIcon(p: IconProps) {
  return (
    <D {...p}>
      <rect x="2" y="3" width="20" height="18" rx="1" />
      <rect x="5" y="7" width="14" height="4" fill="white" />
      <rect x="5" y="13" width="6" height="2" fill="white" />
      <rect x="13" y="13" width="6" height="2" fill="white" />
      <rect x="5" y="17" width="14" height="1.5" fill="white" />
    </D>
  );
}

// ── Technician hard-hat
export function TechnicianIcon(p: IconProps) {
  return (
    <D {...p}>
      {/* hat brim */}
      <rect x="2" y="13" width="20" height="3" rx="1" />
      {/* dome */}
      <path d="M4 13 Q4 5 12 5 Q20 5 20 13Z" />
      {/* body */}
      <rect x="5" y="17" width="14" height="5" rx="1" />
    </D>
  );
}
