"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSelectedPlan,
  clearSelectedPlan,
  type SelectedPlan,
} from "@/lib/plan-intent";
export default function PlanSelectionNotice({
  dashboard = false,
}: {
  dashboard?: boolean;
}) {
  const [plan, setPlan] = useState<SelectedPlan | null>(null);
  useEffect(() => {
    setPlan(getSelectedPlan());
  }, []);
  if (!plan) return null;
  return (
    <aside
      className={
        "w-full rounded-xl border p-4 text-sm " +
        (dashboard ? "mb-4" : "max-w-md")
      }
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-surface)",
        color: "var(--text-primary)",
      }}
      aria-label="Selected plan"
    >
      <strong>{plan} selected.</strong>{" "}
      {dashboard
        ? "Review your chosen plan in Billing. Selection does not change your subscription."
        : "Your account starts on Free. You can review this paid plan after signing in."}{" "}
      {dashboard && (
        <Link
          href={"/dashboard/settings?tab=billing&plan=" + plan}
          className="underline font-semibold"
        >
          Review {plan} pricing
        </Link>
      )}{" "}
      <button
        type="button"
        className="underline ml-2 p-2"
        onClick={() => {
          clearSelectedPlan();
          setPlan(null);
        }}
      >
        Dismiss selection
      </button>
    </aside>
  );
}
