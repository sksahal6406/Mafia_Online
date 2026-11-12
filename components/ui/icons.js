import {
  Crown, Eye, Flag, Gavel, HelpCircle, Moon, Skull, Sun, Sunrise, Syringe, User, Vote, VenetianMask, Drama,
} from 'lucide-react';

const ROLE_ICONS = { mafia: VenetianMask, doctor: Syringe, detective: Eye, civilian: User };

/** SVG icon for a role (replaces the emoji in lib/roles.js). */
export function RoleIcon({ role, className = 'h-5 w-5', ...rest }) {
  const Icon = ROLE_ICONS[role] ?? HelpCircle;
  return <Icon className={className} aria-hidden="true" {...rest} />;
}

const PHASE_ICONS = {
  role_reveal: Drama,
  night_mafia: Moon,
  night_doctor: Moon,
  night_detective: Moon,
  day_announce: Sunrise,
  day_discussion: Sun,
  day_vote: Vote,
  day_revote_discuss: Gavel,
  day_revote: Vote,
  day_result: Gavel,
  game_over: Flag,
};

export function PhaseIcon({ phase, className = 'h-6 w-6', ...rest }) {
  const Icon = PHASE_ICONS[phase] ?? Sun;
  return <Icon className={className} aria-hidden="true" {...rest} />;
}

export { Crown, Skull };

/** Seat colours, drawn from the existing palette so every player is recognisable at a glance. */
const SEATS = [
  'bg-blood text-white',
  'bg-gold text-black',
  'bg-night text-white',
  'bg-town text-black',
  'bg-bone text-black',
  'bg-blood-dark text-white',
];

export function seatColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SEATS[h % SEATS.length];
}

/** Round initial avatar. */
export function Avatar({ name, className = 'h-10 w-10 text-lg' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-black font-display font-bold ${seatColor(name)} ${className}`}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  );
}
