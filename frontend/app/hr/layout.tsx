import SideNav  from "./hr_components/SideNav";
import TopNav   from "./hr_components/TopNav";
import BottomNav from "./hr_components/BottomNav";

/**
 * Shared shell for all /hr/** routes.
 * Renders SideNav (desktop) + TopNav + scrollable {children} + BottomNav (mobile).
 * Each page only needs to supply its own <main> content.
 */
export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">

      {/* ── Desktop Sidebar ──────────────────────── */}
      <SideNav />

      {/* ── Right Column ─────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Sticky top navigation */}
        <TopNav />

        {/*
         * Scrollable canvas:
         *   - pb-24 lg:pb-12 so BottomNav never covers content on mobile
         *   - Each child page controls its own inner padding/layout
         */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-surface"
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation (fixed — FAB exception) */}
      <BottomNav />

    </div>
  );
}
