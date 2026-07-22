import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-zinc-950 to-zinc-950" />

      <div className="relative z-10 max-w-2xl space-y-8">
        <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
          Car Mod Studio
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          3D 虚拟改装店
          <br />
          <span className="text-zinc-400">贴膜 · 包围 · 轮毂 · 一键报价</span>
        </h1>
        <p className="text-zinc-400">
          在线配置 BMW M4 外观方案，实时 3D 预览，自动报价并预约到店施工。
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/configure"
            className="rounded-2xl bg-blue-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
          >
            开始改装
          </Link>
          <Link
            href="/dashboard"
            className="rounded-2xl border border-zinc-700 px-8 py-3.5 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            门店后台
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 text-left text-sm">
          <Feature title="3D 预览" desc="WebGL 实时换色" />
          <Feature title="自动报价" desc="贴膜+套件+工时" />
          <Feature title="预约到店" desc="门店确认施工" />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{desc}</p>
    </div>
  );
}
