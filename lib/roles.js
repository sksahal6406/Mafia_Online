export const ROLE_INFO = {
  mafia: {
    name: 'Mafia',
    emoji: '🔪',
    color: 'text-blood',
    ring: 'ring-blood',
    blurb: 'Each night, agree with your fellow Mafia on one victim. By day, blend in and survive.',
    goal: 'Reach parity with the town.',
  },
  doctor: {
    name: 'Doctor',
    emoji: '💉',
    color: 'text-town',
    ring: 'ring-town',
    blurb: 'Each night, protect one player, yourself included. If the Mafia target them, they live.',
    goal: 'Help the town eliminate the Mafia.',
  },
  detective: {
    name: 'Detective',
    emoji: '🔍',
    color: 'text-night',
    ring: 'ring-night',
    blurb: 'Each night, investigate one player and learn whether they are Mafia. Share it or keep it secret.',
    goal: 'Help the town eliminate the Mafia.',
  },
  civilian: {
    name: 'Civilian',
    emoji: '👤',
    color: 'text-bone',
    ring: 'ring-mute',
    blurb: 'You have no night power. Listen, question, and vote out the Mafia.',
    goal: 'Eliminate every Mafia member.',
  },
};

export const roleInfo = (role) => ROLE_INFO[role] ?? { name: '?', emoji: '❔', color: 'text-mute', ring: 'ring-line', blurb: '', goal: '' };
