"use client";

import { useRef, useState } from "react";
import type { CustomVehicleDefinition } from "@/lib/types";
import { useConfigStore } from "@/store/configStore";

const MAX_MODEL_SIZE = 80 * 1024 * 1024;

interface UploadResponse {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  modelPath: string;
}

interface SavedModelResponse {
  name: string;
  materialNames: CustomVehicleDefinition["materialNames"];
}

function defaultName(fileName: string) {
  return fileName.replace(/\.glb$/i, "").trim() || "自定义车型";
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function isUploadResponse(value: unknown): value is UploadResponse {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;
  return (
    typeof data.id === "string" &&
    typeof data.name === "string" &&
    typeof data.fileName === "string" &&
    typeof data.fileSize === "number" &&
    typeof data.modelPath === "string"
  );
}

function isSavedModelResponse(value: unknown): value is SavedModelResponse {
  if (typeof value !== "object" || value === null) return false;

  const data = value as Record<string, unknown>;
  const materialNames = data.materialNames;
  return (
    typeof data.name === "string" &&
    typeof materialNames === "object" &&
    materialNames !== null &&
    Array.isArray((materialNames as Record<string, unknown>).bodyPaint) &&
    Array.isArray((materialNames as Record<string, unknown>).wheels)
  );
}

function responseError(value: unknown, fallback: string) {
  return typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).error === "string"
    ? (value as Record<string, string>).error
    : fallback;
}

function selectedMaterials(
  customVehicle: CustomVehicleDefinition,
  materialName: string,
) {
  const selected = new Set(customVehicle.materialNames.bodyPaint);
  if (selected.has(materialName)) selected.delete(materialName);
  else selected.add(materialName);
  return [...selected];
}

export default function CustomModelUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const customVehicle = useConfigStore((state) => state.customVehicle);
  const config = useConfigStore((state) => state.config);
  const setVehicle = useConfigStore((state) => state.setVehicle);
  const setCustomVehicle = useConfigStore((state) => state.setCustomVehicle);
  const clearCustomVehicle = useConfigStore((state) => state.clearCustomVehicle);
  const setCustomBodyPaint = useConfigStore((state) => state.setCustomBodyPaint);
  const setCustomWindowMaterial = useConfigStore(
    (state) => state.setCustomWindowMaterial,
  );
  const [vehicleName, setVehicleName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);

  function removeCustomVehicle() {
    clearCustomVehicle();
    setIsConfiguring(false);
    setVehicleName("");
    setMessage("");
  }

  async function uploadModel(file: File) {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setMessage("仅支持已打包纹理的 .glb 文件。");
      return;
    }
    if (file.size === 0 || file.size > MAX_MODEL_SIZE) {
      setMessage("模型大小需在 1 B 至 80 MB 之间。");
      return;
    }

    setUploading(true);
    setMessage("正在上传并校验模型…");
    const name = vehicleName.trim() || defaultName(file.name);
    const formData = new FormData();
    formData.set("model", file);
    formData.set("name", name);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json();

      if (!response.ok || !isUploadResponse(payload)) {
        throw new Error(responseError(payload, "模型上传失败"));
      }

      setCustomVehicle({
        id: `custom-${payload.id}`,
        name: payload.name,
        modelPath: payload.modelPath,
        sourceUrl: "",
        sourceLabel: "本地上传 GLB",
        capabilities: { livery: false },
        materialNames: { bodyPaint: [], wheels: [] },
        isCustom: true,
        fileName: payload.fileName,
        fileSize: payload.fileSize,
        availableMaterials: [],
      });
      setVehicleName(payload.name);
      setIsConfiguring(true);
      setMessage("模型已载入，请确认材质映射后保存车型设置。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "模型上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function saveModelSettings() {
    if (!customVehicle) return;

    if (customVehicle.materialNames.bodyPaint.length === 0) {
      setMessage("请至少勾选一个车漆材质，否则换色不会生效。");
      return;
    }

    const id = customVehicle.id.replace(/^custom-/, "");
    const name = vehicleName.trim() || customVehicle.name;
    setSaving(true);
    setMessage("正在保存车型设置…");

    try {
      const response = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          materialNames: customVehicle.materialNames,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isSavedModelResponse(payload)) {
        throw new Error(responseError(payload, "车型设置保存失败"));
      }

      setCustomVehicle({
        ...customVehicle,
        name: payload.name,
        materialNames: payload.materialNames,
      });
      setVehicleName("");
      setIsConfiguring(false);
      setMessage("车型名称和材质映射已保存，可继续导入其他车型。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "车型设置保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        自定义车型
      </h3>
      <p className="text-xs leading-relaxed text-zinc-500">
        上传已打包纹理的 GLB，命名后即可作为车型预览；支持最大 80 MB。
      </p>
      <input
        value={vehicleName}
        onChange={(event) => setVehicleName(event.target.value)}
        maxLength={80}
        placeholder="例如：Porsche 911 GT3"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-blue-500"
      />
      <input
        ref={inputRef}
        type="file"
        accept=".glb,model/gltf-binary"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadModel(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-blue-500/60 bg-blue-500/5 px-4 py-3 text-sm font-medium text-blue-200 transition hover:bg-blue-500/10 disabled:cursor-wait disabled:opacity-60"
      >
        {uploading ? "正在导入…" : "选择 GLB 模型"}
      </button>
      {message && <p className="text-xs text-zinc-400">{message}</p>}

      {customVehicle && !isConfiguring && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setVehicleName(customVehicle.name);
              setIsConfiguring(true);
              setMessage("可重新编辑材质映射后保存。");
            }}
            className="text-xs text-blue-300 transition hover:text-blue-100"
          >
            编辑材质映射
          </button>
          <button
            type="button"
            onClick={removeCustomVehicle}
            className="text-xs text-zinc-500 transition hover:text-zinc-200"
          >
            移除当前自定义车型
          </button>
        </div>
      )}

      {customVehicle && isConfiguring && (
        <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {customVehicle.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {customVehicle.fileName} · {formatFileSize(customVehicle.fileSize)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVehicle(customVehicle.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                config.vehicleId === customVehicle.id
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {config.vehicleId === customVehicle.id ? "预览中" : "使用"}
            </button>
          </div>

          {customVehicle.availableMaterials.length > 0 && (
            <div className="space-y-3 border-t border-zinc-800 pt-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">车漆材质映射</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  已自动识别；勾选需要响应车漆的材质，避免玻璃或内饰被换色。
                </p>
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                {customVehicle.availableMaterials.map((materialName) => (
                  <label
                    key={materialName}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={customVehicle.materialNames.bodyPaint.includes(
                        materialName,
                      )}
                      onChange={() =>
                        setCustomBodyPaint(
                          selectedMaterials(customVehicle, materialName),
                        )
                      }
                      className="accent-blue-500"
                    />
                    <span className="truncate">{materialName}</span>
                  </label>
                ))}
              </div>
              <label className="block text-xs text-zinc-400">
                玻璃材质
                <select
                  value={customVehicle.materialNames.windows ?? ""}
                  onChange={(event) =>
                    setCustomWindowMaterial(event.target.value || undefined)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                >
                  <option value="">不指定</option>
                  {customVehicle.availableMaterials.map((materialName) => (
                    <option key={materialName} value={materialName}>
                      {materialName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveModelSettings()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "保存中…" : "保存车型设置"}
            </button>
            <button
              type="button"
              onClick={removeCustomVehicle}
              className="text-xs text-zinc-500 transition hover:text-zinc-200"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
