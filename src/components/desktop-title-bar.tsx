const HEX = "16,5 48,5 63,32 48,59 16,59 1,32";

/**
 * The desktop app's title strip (locked design docs/design/desktop-app.html, option Y): the
 * Windows buttons sit over its right end, and dragging it moves the window. Rendered always,
 * shown only inside the desktop window (`desktop:` variant, html[data-desktop]).
 */
export function DesktopTitleBar() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-30 hidden h-(--titlebar-h) items-center gap-2 border-b border-border/60 bg-background px-2.5 text-xs text-muted-foreground select-none [-webkit-app-region:drag] desktop:flex"
    >
      {/* the app icon: a lit key, its edge light mid-chase (desktop/assets/icon.svg) */}
      <svg viewBox="0 0 64 64" className="size-4">
        <polygon points={HEX} className="fill-background" />
        <polygon
          points={HEX}
          className="fill-none stroke-primary [stroke-dasharray:70_30] [stroke-linecap:round] [stroke-width:4]"
        />
        <polygon points="24,19 40,19 48,32 40,45 24,45 16,32" className="fill-primary" />
      </svg>
      Jugaad
    </div>
  );
}
