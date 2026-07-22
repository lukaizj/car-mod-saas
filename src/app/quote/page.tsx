"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TIME_SLOTS } from "@/lib/catalog";
import { calculateQuote } from "@/lib/pricing";
import { useConfigStore } from "@/store/configStore";

export default function QuotePage() {
  const config = useConfigStore((s) => s.config);
  const quote = useMemo(() => calculateQuote(config), [config]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [minimumDate] = useState(() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const tomorrow = new Date(
      Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
    );
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          customer,
          phone,
          date,
          timeSlot,
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "提交失败");
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-green-500/20 p-4 text-4xl">✓</div>
        <h1 className="text-2xl font-bold">预约已提交</h1>
        <p className="text-zinc-400">
          门店将在 24 小时内联系您确认方案与施工时间。
        </p>
        <div className="flex gap-4">
          <Link
            href="/configure"
            className="rounded-xl border border-zinc-700 px-6 py-2 text-sm hover:bg-zinc-800"
          >
            继续改装
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500"
          >
            查看后台
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link href="/configure" className="text-sm text-zinc-400 hover:text-white">
        ← 返回配置器
      </Link>

      <h1 className="mt-4 text-2xl font-bold">方案报价 & 预约</h1>
      <p className="mt-1 text-zinc-400">{config.vehicleName}</p>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="mb-4 font-semibold">费用明细</h2>
        <ul className="space-y-2 text-sm">
          {quote.lines.map((line) => (
            <li key={line.label} className="flex justify-between text-zinc-300">
              <span>{line.label}</span>
              <span>¥{line.amount.toLocaleString()}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-zinc-700 pt-4 text-lg font-bold">
          <span>合计</span>
          <span className="text-blue-400">¥{quote.total.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <h2 className="font-semibold">预约到店</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">姓名</span>
            <input
              required
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-blue-500"
              placeholder="张先生"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">手机</span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-blue-500"
              placeholder="13800000000"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">日期</span>
            <input
              required
              type="date"
              value={date}
              min={minimumDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">时段</span>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-blue-500"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-400">备注（可选）</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none focus:border-blue-500"
            placeholder="特殊需求、到店方式等"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {submitting ? "提交中…" : "确认预约"}
        </button>
      </form>
    </div>
  );
}
