"use client";

import { useEffect, useRef, useState } from "react";
import { generatePosterCanvas } from "@/lib/posterGenerator";
import type { CarConfig, QuoteResult } from "@/lib/types";

interface PosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CarConfig;
  quote: QuoteResult;
  vehicleName: string;
  shareUrl: string;
}

export default function PosterModal({
  isOpen,
  onClose,
  config,
  quote,
  vehicleName,
  shareUrl,
}: PosterModalProps) {
  const [posterUrl, setPosterUrl] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(true);
  const [toast, setToast] = useState<string>("");
  const posterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const timer = setTimeout(() => {
      const carCanvas = document.querySelector<HTMLCanvasElement>(
        "#car-configurator canvas",
      );

      if (!carCanvas) {
        if (active) {
          showToast("3D 渲染画面未就绪");
          setGenerating(false);
        }
        return;
      }

      try {
        const canvas = generatePosterCanvas({
          carCanvas,
          config,
          quote,
          vehicleName,
          shareUrl,
        });
        if (active) {
          posterCanvasRef.current = canvas;
          setPosterUrl(canvas.toDataURL("image/png"));
        }
      } catch (err) {
        console.error(err);
        if (active) showToast("海报生成失败");
      } finally {
        if (active) setGenerating(false);
      }
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, config, quote, vehicleName, shareUrl]);

  function handleClose() {
    setPosterUrl("");
    setGenerating(true);
    posterCanvasRef.current = null;
    onClose();
  }

  async function handleCopyImage() {
    const canvas = posterCanvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Blob conversion failed");
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          showToast("海报图片已复制到剪贴板");
        } else {
          showToast("当前环境不支持直接复制图片，请点击下载");
        }
      }, "image/png");
    } catch {
      showToast("复制图片失败，请直接下载");
    }
  }

  function handleDownload() {
    const canvas = posterCanvasRef.current;
    if (!canvas && !posterUrl) return;

    try {
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = "carmod-" + config.vehicleId + "-" + dateStr + ".png";
      link.href = posterUrl || (canvas ? canvas.toDataURL("image/png") : "");
      link.click();
      showToast("高清海报已保存");
    } catch {
      showToast("下载失败");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-hidden md:flex-row gap-6">
        {/* Toast */} 
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-xl border border-blue-500/30 bg-black/90 px-4 py-2 text-xs font-semibold text-blue-400 shadow-xl backdrop-blur-md">
            {toast}
          </div>
        )}

        {/* Close Button */} 
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-zinc-800/80 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-white transition"
          title="关闭"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left: Poster Preview */} 
        <div className="relative flex flex-1 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2 overflow-hidden min-h-[360px] max-h-[75vh]">
          {generating ? (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-xs font-medium">正在合成高清改装海报…</span>
            </div>
          ) : posterUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={posterUrl}
              alt="改装海报预览"
              className="h-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
            />
          ) : (
            <p className="text-xs text-zinc-500">未捕获到 3D 渲染画面</p>
          )}
        </div>

        {/* Right: Info & Controls */} 
        <div className="flex w-full md:w-80 flex-col justify-between space-y-4 pt-2 md:pt-0">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
              CARMOD STUDIO · POSTER
            </span>
            <h2 className="mt-1 text-xl font-bold text-white">
              专属改装海报
            </h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              包含 3D 实车视角、全套改装参数与专属扫码交互链接，适合分享至朋友圈或车友群。
            </p>

            <div className="mt-4 space-y-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>车型</span>
                <span className="font-medium text-zinc-200">{vehicleName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>车漆 / 贴膜</span>
                <span className="font-medium text-zinc-200">{config.paint.colorName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>拉花涂装</span>
                <span className="font-medium text-zinc-200">{config.appearance.liveryName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>轮毂 / 卡钳</span>
                <span className="font-medium text-zinc-200">
                  {config.appearance.wheelColorName} · {config.appearance.caliperColorName}
                </span>
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between items-baseline">
                <span className="text-zinc-400">预算总计</span>
                <span className="text-base font-bold text-blue-400">
                  ¥{quote.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={generating || !posterUrl}
              onClick={handleDownload}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载高清海报 (PNG)
            </button>

            <button
              type="button"
              disabled={generating || !posterUrl}
              onClick={handleCopyImage}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制海报到剪贴板
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2 text-center text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              返回配置器
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}