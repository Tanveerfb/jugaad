type Props = {
  lines?: number;
  className?: string;
};

export default function LoadingSkeleton({ lines = 4, className = "" }: Props) {
  return (
    <div
      className={`px-3 py-2 space-y-2 ${className}`}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted/60 animate-pulse"
          style={{ width: `${60 + ((i * 23) % 40)}%` }}
        />
      ))}
    </div>
  );
}
