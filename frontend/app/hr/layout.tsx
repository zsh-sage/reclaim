import SideNav    from "./hr_components/SideNav";
import TopNav     from "./hr_components/TopNav";
import BottomNav  from "./hr_components/BottomNav";
import HRRoleGuard from "./hr_components/HRRoleGuard";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HRRoleGuard>
      <div className="flex min-h-screen lg:h-screen lg:overflow-hidden bg-surface text-on-surface">

        {/* ── Desktop Sidebar ──────────────────────── */}
        <SideNav />

        {/* ── Right Column ─────────────────────────── */}
        <div className="flex-1 flex flex-col lg:h-screen lg:overflow-hidden min-w-0">

          {/* Sticky top navigation */}
          <TopNav />

          <main
            id="main-content"
            className="flex-auto lg:flex-1 lg:overflow-y-auto bg-surface pb-nav-safe"
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation (fixed — FAB exception) */}
        <BottomNav />

      </div>
    </HRRoleGuard>
  );
}
