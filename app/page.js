import HomeForm from '@/components/HomeForm';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-blood">The town sleeps</p>
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-7xl">Mafia Overseas</h1>
        <p className="mx-auto mt-4 max-w-md text-mute">
          Lie, deduce, survive. Create a room, share the link, and play face to face over live video. No accounts needed.
        </p>
      </div>
      <HomeForm />
    </main>
  );
}
