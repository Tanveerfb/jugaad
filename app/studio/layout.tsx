import AppShell from "@/components/layout/AppShell";
import Sidebar from "@/components/layout/Sidebar";
import CenterPanel from "@/components/layout/CenterPanel";
import RightPanel from "@/components/layout/RightPanel";

export default function StudioLayout() {
  return (
    <AppShell
      sidebar={<Sidebar />}
      center={<CenterPanel />}
      right={<RightPanel />}
    />
  );
}
