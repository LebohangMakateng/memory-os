export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function formatDate(date: Date | null) {
  if (!date) return "No active week";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
