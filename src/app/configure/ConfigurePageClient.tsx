"use client";

import Link from "next/link";
import { useMemo } from "react";
import CarConfigurator from "@/components/configurator/CarConfigurator";
import ConfigPanel from "@/components/configurator/ConfigPanel";
import ConfiguratorActions from "@/components/configurator/ConfiguratorActions";
import { getVehicle } from "@/lib/catalog";
import { calculateQuote } from "@/lib/pricing";
import { useConfigStore } from "@/store/configStore";

export default function ConfigurePageClient() {
  const config = useConfigStore((s) => s.config);
  const customVehicle = useConfigStore((s) => s.customVehicle);
  const setCustomMaterialCatalog = useConfigStore(
    (s) => s.setCustomMaterialCatalog,
  );
  const vehicle =
    customVehicle?.id === config.vehicleId
      ? customVehicle
      : getVehicle(config.vehicleId);
  const quote = useMemo(() => calculateQuote(config), [config]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-400">
            3D 改装配置器
          </p>
          <h1 className="text-2xl font-bold">{config.vehicleName}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {vehicle.sourceUrl ? (
            <a
              href={vehicle.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {vehicle.sourceLabel}
            </a>
          ) : (
            <span className="text-xs text-zinc-500">{vehicle.sourceLabel}</span>
          )}
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">
            门店后台 →
          </Link>
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="relative h-[58vh] min-h-[420px] max-h-[720px] self-start lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:min-h-[560px] lg:max-h-[760px]">
          <CarConfigurator
            vehicle={vehicle}
            color={config.paint.color}
            paintType={config.paint.type}
            liveryId={config.appearance.liveryId}
            wheelColor={config.appearance.wheelColor}
            caliperColor={config.appearance.caliperColor}
            onMaterialsDiscovered={
              vehicle.isCustom ? setCustomMaterialCatalog : undefined
            }
          />
          <ConfiguratorActions />
        </div>

        <aside className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
          <ConfigPanel />

          <div className="mt-auto space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-zinc-400">预估报价</span>
              <span className="text-2xl font-bold text-white">
                ¥{quote.total.toLocaleString()}
              </span>
            </div>
            <Link
              href="/quote"
              className="block w-full rounded-xl bg-blue-600 py-3 text-center font-semibold text-white transition hover:bg-blue-500"
            >
              查看明细 & 预约
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
