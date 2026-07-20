import { formatDate } from "@/lib/format";

interface FormattedDateProps {
  date: Date | string | number | null | undefined;
  className?: string;
}

export function FormattedDate({ date, className = "" }: FormattedDateProps) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatDate(date)}
    </span>
  );
}
