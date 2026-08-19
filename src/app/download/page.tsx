import Link from "next/link";

export default function DownloadPage() {
  const downloadUrl =
    "https://github.com/lukaizj/car-mod-saas/releases/download/v0.1.0/carmod-0.1.0-arm64.dmg";
  const releaseUrl =
    "https://github.com/lukaizj/car-mod-saas/releases/tag/v0.1.0";
  const sha256 =
    "bbc442dbd3a59a734635bfa6937c4993a8ad8214ca324001cdc321c1f973c34a";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-zinc-950 to-zinc-950" />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">
            Car Mod Studio · Desktop
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            下载 CarMod macOS 桌面客户端
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            原生离线支持，本地持久化数据库与自定义车型资产，畅享流畅 3D 改装体验。
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  最新版本 v0.1.0
                </span>
                <span className="text-xs text-zinc-400">macOS Apple Silicon (arm64)</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-100">
                carmod-0.1.0-arm64.dmg
              </h2>
              <p className="mt-1 text-xs text-zinc-400">文件大小：约 559 MB</p>
            </div>

            <a
              href={downloadUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 sm:w-auto"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5M12 3v13.5"
                />
              </svg>
              立即下载 DMG
            </a>
          </div>

          <div className="space-y-4 pt-6 text-xs text-zinc-400">
            <div>
              <span className="font-medium text-zinc-300">SHA-256 校验和：</span>
              <code className="mt-1 block break-all rounded border border-zinc-800 bg-zinc-950/80 p-2 font-mono text-[11px] text-zinc-400">
                {sha256}
              </code>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-zinc-300">
              <p className="font-medium text-amber-400">安装提示：</p>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-zinc-400">
                <li>下载 DMG 后双击打开，将 CarMod 拖移至「应用程序」文件夹。</li>
                <li>若 macOS 提示「无法打开，因为无法验证开发者」，请在「系统设置 → 隐私与安全性」中点击「仍要打开」，或右键点击 App 选择「打开」。</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 underline-offset-4 hover:underline"
              >
                查看 GitHub Release 发布详情 →
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link
            href="/configure"
            className="text-zinc-400 transition hover:text-white"
          >
            直接在线体验 3D 配置器 →
          </Link>
          <span className="text-zinc-700">·</span>
          <Link
            href="/"
            className="text-zinc-400 transition hover:text-white"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
