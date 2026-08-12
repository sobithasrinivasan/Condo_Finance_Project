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

  return m.format("MMM DD, YYYY");
};

export function isDateField(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  return k.includes("date") || k === "due" || k === "created" || k === "received";
}

export function formatToInputDate(value: any): string {
  if (!value) return "";
  const m = moment(value, [
    "YYYY-MM-DD",
    "MM/DD/YYYY",
    "M/D/YYYY",
    "MMM D, YYYY",
    "MMM DD, YYYY",
    "MM-DD-YYYY",
    "D MMM YYYY",
    "DD MMM YYYY"
  ]);
  return m.isValid() ? m.format("YYYY-MM-DD") : "";
}

export function formatFromInputDate(value: string, format = "MMM D, YYYY"): string {
  if (!value) return "";
  const m = moment(value, "YYYY-MM-DD");
  return m.isValid() ? m.format(format) : value;
}

export function isAmountField(key: string): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  return k.includes("amount") || k.includes("price") || k.includes("rate") || k.includes("total") || k.includes("balance") || k.includes("expected") || k.includes("received");
}

export function cleanAmountInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
}
