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
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface">

        {/* ── Desktop Sidebar ──────────────────────── */}
        <SideNav />

        {/* ── Right Column ─────────────────────────── */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

          {/* Sticky top navigation */}
          <TopNav />

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
    </HRRoleGuard>
  );
}
