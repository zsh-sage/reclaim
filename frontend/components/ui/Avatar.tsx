import { avatarGradient, initialsOf } from "./styles";

const SIZES = {
  sm: "w-7 h-7 text-[10px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
} as const;

export function Avatar({
  name,
  initials,
  size = "md",
  className = "",
}: {
  name: string;
  initials?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={name}
      className={`${SIZES[size]} inline-flex shrink-0 select-none items-center justify-center rounded-full bg-linear-to-br ${avatarGradient(name)} font-semibold text-white ring-2 ring-white shadow-[0_2px_6px_-2px_rgb(20_20_43/0.3)] ${className}`}
    >
      {initials ?? initialsOf(name)}
    </span>
  );
}
