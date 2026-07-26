import moment from "moment";


export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  return `${month}/${day}/${year}`;
}

export const formatDateDisplay = (date?: string | Date | number | null): string => {
  if (!date) return "";
  const m = moment(date);
  if (!m.isValid()) return "";

  if (m.isSame(moment(), "day")) {
    return "Today";
  }

  if (m.isSame(moment().subtract(1, "day"), "day")) {
    return "Yesterday";
  }

  return m.format("MMM D, YYYY");
};
