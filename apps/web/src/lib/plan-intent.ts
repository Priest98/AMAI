export type SelectedPlan = "PRO" | "CREATOR" | "AGENCY";
const key = "oyinca_selected_plan";
export function getSelectedPlan(): SelectedPlan | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("plan");
  const valid = (value: unknown): value is SelectedPlan =>
    value === "PRO" || value === "CREATOR" || value === "AGENCY";
  try {
    if (raw === "FREE") {
      localStorage.removeItem(key);
      return null;
    }
    if (valid(raw)) {
      localStorage.setItem(
        key,
        JSON.stringify({ plan: raw, expires: Date.now() + 7 * 86400000 }),
      );
      return raw;
    }
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && valid(saved.plan) && saved.expires > Date.now())
      return saved.plan;
    localStorage.removeItem(key);
  } catch {
    if (valid(raw)) return raw;
  }
  return null;
}
export function clearSelectedPlan() {
  const url = new URL(window.location.href);
  url.searchParams.delete("plan");
  window.history.replaceState(window.history.state, "", url);
  try {
    localStorage.removeItem(key);
  } catch {}
}
export function planDestination() {
  const plan = getSelectedPlan();
  return plan ? "/dashboard/settings?tab=billing&plan=" + plan : "/dashboard";
}
