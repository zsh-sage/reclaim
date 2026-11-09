/**
 * Shared class recipes. Kept as strings (not components) so they compose with
 * <Link>, <button>, <a> and anything else without wrapper gymnastics.
 */

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none " +
  "transition-[background-color,box-shadow,color,transform,opacity] duration-200 ease-out " +
  "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

export const btn = {
  primary: `${base} h-11 px-5 text-sm text-white bg-primary hover:bg-primary-dim shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_1px_2px_rgb(20_20_43/0.2)]`,
  dark: `${base} h-11 px-5 text-sm text-white bg-ink hover:bg-ink-3 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_1px_2px_rgb(11_11_30/0.3)]`,
  secondary: `${base} h-11 px-5 text-sm text-on-surface bg-white hover:bg-surface-container-low shadow-[0_0_0_1px_rgb(20_20_43/0.1),0_1px_2px_rgb(20_20_43/0.06)] hover:shadow-[0_0_0_1px_rgb(20_20_43/0.16),0_2px_6px_rgb(20_20_43/0.08)]`,
  ghost: `${base} h-10 px-4 text-sm text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5`,
  onDark: `${base} h-11 px-5 text-sm text-ink bg-white hover:bg-white/90`,
  onDarkGhost: `${base} h-11 px-5 text-sm text-white bg-white/10 hover:bg-white/15 shadow-[0_0_0_1px_rgb(255_255_255/0.18)_inset]`,
  sm: "h-9 px-3.5 text-[13px]",
  lg: "h-12 px-6 text-[15px]",
  icon: `${base} h-10 w-10 text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5`,
} as const;

export const eyebrow =
  "inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-primary";

export const card =
  "bg-surface-container-lowest rounded-[20px] shadow-ambient";

export const input =
  "w-full h-11 px-4 rounded-xl bg-white text-sm text-on-surface placeholder:text-on-surface-variant/60 " +
  "shadow-[0_0_0_1px_rgb(20_20_43/0.1),0_1px_2px_rgb(20_20_43/0.04)] " +
  "focus:outline-none focus:shadow-[0_0_0_1px_var(--color-secondary),0_0_0_4px_rgb(16_91_255/0.15)] " +
  "transition-shadow";

/** Deterministic gradient for initials avatars. */
const AVATAR_GRADIENTS = [
  "from-[#4647d3] to-[#105bff]",
  "from-[#6a19c4] to-[#4647d3]",
  "from-[#105bff] to-[#22b8ff]",
  "from-[#9e00b4] to-[#fe8500]",
  "from-[#4647d3] to-[#9e00b4]",
  "from-[#0b0b1e] to-[#4647d3]",
];

export function avatarGradient(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
