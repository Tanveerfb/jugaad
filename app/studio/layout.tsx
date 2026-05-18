// Prevent SSR prerendering — all studio routes require client-side Firebase
export const dynamic = "force-dynamic";

import AppShell from "@/components/layout/AppShell";
import Sidebar from "@/components/layout/Sidebar";
import RightPanel from "@/components/layout/RightPanel";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell sidebar={<Sidebar />} center={children} right={<RightPanel />} />
  );
}
