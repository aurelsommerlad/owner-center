export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl italic text-ink sm:text-3xl">{title}</h1>
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-paper-dim/40 px-6 py-20 text-center">
        <p className="font-display text-xl italic text-ink">In Vorbereitung</p>
        <p className="mt-3 max-w-md text-sm text-ink-soft">{description}</p>
      </div>
    </div>
  );
}
