import type { IndexSummary } from "@/schemas/indexed-file-schema";

const count = new Intl.NumberFormat("en");

/** Bytes as the owner reads them: "14.2 GB", "820 MB". */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** What the index knows about a folder. Counts that are zero and unremarkable are left out. */
export function IndexFacts({ summary }: { summary: IndexSummary }) {
  const facts: [string, string][] = [
    [count.format(summary.files), summary.files === 1 ? "file" : "files"],
    [formatBytes(summary.bytes), "total"],
    [count.format(summary.duplicateFiles), "duplicates"],
  ];
  if (summary.onlineOnly) facts.push([count.format(summary.onlineOnly), "online-only"]);
  if (summary.locked) facts.push([count.format(summary.locked), "locked, retried next scan"]);

  return (
    <dl className="m-0 flex flex-wrap gap-x-[22px] gap-y-2">
      {facts.map(([value, label]) => (
        <div key={label} className="grid">
          <dt className="order-2 text-[12.5px] text-muted-foreground">{label}</dt>
          <dd className="order-1 m-0 font-mono text-xl font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
