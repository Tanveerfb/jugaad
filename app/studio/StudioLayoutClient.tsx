"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Sidebar from "@/components/layout/Sidebar";
import RightPanel from "@/components/layout/RightPanel";

export default function StudioLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNewProject = pathname === "/studio/new";

  return (
    <AppShell
      sidebar={<Sidebar />}
      center={children}
      right={isNewProject ? undefined : <RightPanel />}
    />
  );
}
