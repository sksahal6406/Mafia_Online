import { Moon, Sun, Vote } from 'lucide-react';
import HomeForm from '@/components/HomeForm';
import { RoleIcon } from '@/components/ui/icons';
import { ROLE_INFO } from '@/lib/roles';

const FAN = [
  { role: 'mafia', tilt: '-8deg', lift: 'mt-4' },
  { role: 'doctor', tilt: '-3deg', lift: '' },
  { role: 'detective', tilt: '3deg', lift: '' },
  { role: 'civilian', tilt: '8deg', lift: 'mt-4' },
];

const BORDER = { mafia: 'border-blood', doctor: 'border-town', detective: 'border-night', civilian: 'border-bone' };

const STEPS = [
  { icon: Moon, title: 'Night falls', text: 'Everyone goes silent. The Mafia picks a victim, the Doctor and Detective do their thing.' },
  { icon: Sun, title: 'Day breaks', text: 'Find out who is gone, then argue it out on camera. Somebody is lying.' },
  { icon: Vote, title: 'Vote', text: 'Point the finger. Majority rules. Last side standing wins.' },
];

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <section>
        <p className="chip mb-4 border-blood/60 bg-blood/10 text-blood">
          <Moon className="h-3.5 w-3.5" aria-hidden="true" /> The town sleeps
        </p>
        <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-8xl">
          Mafia
          <span className="block -rotate-2 text-blood [text-shadow:4px_4px_0_#000]">Overseas</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-mute">
          The classic party game of lies and hunches, played face to face over live video. Grab some friends, no sign-up needed.
        </p>

        <ul className="mt-10 flex justify-center gap-2 sm:justify-start sm:gap-3" aria-label="The roles">
          {FAN.map(({ role, tilt, lift }) => {
            const info = ROLE_INFO[role];
            return (
              <li
                key={role}
                style={{ '--tilt': tilt, transform: `rotate(${tilt})` }}
                className={`${lift} flex w-[4.9rem] flex-col items-center gap-2 rounded-xl border-2 bg-panel px-2 py-4 shadow-[3px_3px_0_0_#000] transition hover:-translate-y-2 sm:w-28 ${BORDER[role]}`}
              >
                <RoleIcon role={role} className={`h-8 w-8 sm:h-10 sm:w-10 ${info.color}`} />
                <span className="font-display text-sm font-semibold sm:text-base">{info.name}</span>
              </li>
            );
          })}
        </ul>

        <ol className="mt-10 hidden gap-4 sm:grid sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <p className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-sm font-bold text-black">{i + 1}</span>
                {title}
                <Icon className="h-4 w-4 text-mute" aria-hidden="true" />
              </p>
              <p className="text-sm text-mute">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex justify-center lg:justify-end">
        <HomeForm />
      </section>
    </main>
  );
}
