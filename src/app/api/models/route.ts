import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { VehicleMaterialNames } from "@/lib/types";

export const runtime = "nodejs";

const MAX_MODEL_SIZE = 80 * 1024 * 1024;
const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;

export interface StoredModel {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  modelPath: string;
  materialNames: VehicleMaterialNames;
  updatedAt: string;
}

export function uploadDirectory() {
  return path.join(process.cwd(), "public", "models", "uploads");
}

export function modelMetadataPath(id: string) {
  return path.join(uploadDirectory(), `${id}.json`);
}

function isGlb(buffer: ArrayBuffer) {
  if (buffer.byteLength < 12) return false;

  const view = new DataView(buffer);
  return (
    view.getUint32(0, true) === GLB_MAGIC &&
    view.getUint32(4, true) === GLB_VERSION
  );
}

function normalizeVehicleName(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;

  const name = value.trim().replace(/\s+/g, " ");
  return name.slice(0, 80) || fallback;
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "上传请求格式无效" }, { status: 400 });
  }

  const model = formData.get("model");
  if (!(model instanceof File)) {
    return NextResponse.json({ error: "请选择 GLB 模型文件" }, { status: 400 });
  }

  if (!model.name.toLowerCase().endsWith(".glb")) {
    return NextResponse.json({ error: "当前仅支持 .glb 格式" }, { status: 400 });
  }

  if (model.size === 0 || model.size > MAX_MODEL_SIZE) {
    return NextResponse.json(
      { error: "模型大小需在 1 B 至 80 MB 之间" },
      { status: 400 },
    );
  }

  const bytes = await model.arrayBuffer();
  if (!isGlb(bytes)) {
    return NextResponse.json({ error: "文件不是有效的 GLB 2.0 模型" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const directory = uploadDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.glb`), new Uint8Array(bytes));

  const fallbackName = model.name.replace(/\.glb$/i, "").slice(0, 80);
  const storedModel: StoredModel = {
    id,
    name: normalizeVehicleName(formData.get("name"), fallbackName),
    fileName: model.name,
    fileSize: model.size,
    modelPath: `/models/uploads/${id}.glb`,
    materialNames: { bodyPaint: [], wheels: [] },
    updatedAt: new Date().toISOString(),
  };
  await writeFile(modelMetadataPath(id), JSON.stringify(storedModel, null, 2));

  return NextResponse.json(storedModel, { status: 201 });
}
