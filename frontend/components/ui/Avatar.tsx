export function Avatar({ name, initials }: { name: string; initials: string }) {
  return (
    <div
      aria-label={name}
      className="w-9 h-9 rounded-full bg-secondary-container flex items-center
                 justify-center text-on-secondary-container font-bold text-xs
                 shrink-0 select-none ring-2 ring-surface-container-lowest"
    >
      {initials}
    </div>
  );
}
