import SideNav          from "./_components/SideNav";
import TopNav           from "./_components/TopNav";
import BottomNav        from "./_components/BottomNav";
import EmployeeRoleGuard from "./_components/EmployeeRoleGuard";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmployeeRoleGuard>
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
    </EmployeeRoleGuard>
  );
}
