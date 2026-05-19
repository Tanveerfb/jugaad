// Prevent SSR prerendering — all studio routes require client-side Firebase
export const dynamic = "force-dynamic";

import StudioLayoutClient from "./StudioLayoutClient";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudioLayoutClient>{children}</StudioLayoutClient>;
}
