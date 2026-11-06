interface Props {
  pos: number;
  hot?: boolean;
}

export default function RangeBar({ pos, hot = false }: Props) {
  const percent = Math.min(100, Math.max(0, Number.isFinite(pos) ? pos * 100 : 50));

  return (
    <span className={`rangebar${hot ? " rangebar--hot" : ""}`} aria-hidden="true">
      <span className="rangebar__fill" style={{ width: `${percent}%` }} />
      <span className="rangebar__marker" style={{ left: `${percent}%` }} />
    </span>
  );
}
