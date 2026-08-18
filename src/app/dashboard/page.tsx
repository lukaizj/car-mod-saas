"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CarConfig } from "@/lib/types";

interface AppointmentRow {
  id: string;
  date: string;
  timeSlot: string;
  customer: string;
  phone: string;
  note: string | null;
  status: string;
  createdAt: string;
  quote: {
    total: number;
    config: string;
    breakdown: string;
  };
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/appointments")
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok || !Array.isArray(payload)) {
          throw new Error("读取预约失败");
        }
        setAppointments(payload as AppointmentRow[]);
      })
      .catch((fetchError) => {
        setAppointments([]);
        setError(fetchError instanceof Error ? fetchError.message : "读取预约失败");
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: string) {
    setError("");
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isAppointmentStatusPayload(payload)) {
        throw new Error(readApiError(payload, "更新预约失败"));
      }
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === id
            ? { ...appointment, status: payload.status }
            : appointment,
        ),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "更新预约失败",
      );
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-400">
            门店后台
          </p>
          <h1 className="text-2xl font-bold">极速贴膜 · 改装工坊</h1>
          <p className="text-sm text-zinc-400">上海市浦东新区 · 09:00-18:00</p>
        </div>
        <Link
          href="/configure"
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium hover:bg-blue-500"
        >
          打开配置器
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="待确认" value={appointments.filter((a) => a.status === "pending").length} />
        <StatCard label="已确认" value={appointments.filter((a) => a.status === "confirmed").length} />
        <StatCard label="总预约" value={appointments.length} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">客户</th>
              <th className="px-4 py-3 font-medium">时间</th>
              <th className="px-4 py-3 font-medium">方案</th>
              <th className="px-4 py-3 font-medium">金额</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  暂无预约，去{" "}
                  <Link href="/configure" className="text-blue-400 underline">
                    配置器
                  </Link>{" "}
                  创建第一条
                </td>
              </tr>
            )}
            {appointments.map((a) => {
              const summary = summarizeConfig(a.quote.config);
              return (
                <tr key={a.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <div>{a.customer}</div>
                    <div className="text-xs text-zinc-500">{a.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.date} {a.timeSlot}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {summary}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ¥{a.quote.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(a.id, "confirmed")}
                        className="rounded-lg bg-green-600/20 px-3 py-1 text-xs text-green-400 hover:bg-green-600/30"
                      >
                        确认
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAppointmentStatusPayload(
  value: unknown,
): value is { status: string } {
  return isRecord(value) && typeof value.status === "string";
}

function readApiError(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback;
}

function summarizeConfig(value: string) {
  try {
    const config = JSON.parse(value) as CarConfig;
    if (
      typeof config.paint?.colorName !== "string" ||
      typeof config.mods?.wheelsId !== "string" ||
      typeof config.mods?.wheelsName !== "string"
    ) {
      return "配置数据异常";
    }
    return config.mods.wheelsId === "stock"
      ? config.paint.colorName
      : `${config.paint.colorName} · ${config.mods.wheelsName}`;
  } catch {
    return "配置数据异常";
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "confirmed"
      ? "bg-green-500/20 text-green-400"
      : status === "cancelled"
        ? "bg-red-500/20 text-red-400"
        : "bg-yellow-500/20 text-yellow-400";
  const labels: Record<string, string> = {
    pending: "待确认",
    confirmed: "已确认",
    cancelled: "已取消",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs ${styles}`}>
      {labels[status] ?? status}
    </span>
  );
}
