import { readFile, stat, writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import {
  modelFilePath,
  modelMetadataPath,
  modelUrl,
  type StoredModel,
} from "../route";
import type { VehicleMaterialNames } from "@/lib/types";

export function isModelId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function stringArray(value: unknown) {
  if (!Array.isArray(value) || value.length > 200) return null;
  if (!value.every((item) => typeof item === "string" && item.length <= 160)) {
    return null;
  }
  return [...new Set(value)];
}

function parseMaterialNames(value: unknown): VehicleMaterialNames | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const bodyPaint = stringArray(input.bodyPaint);
  const wheels = stringArray(input.wheels);
  if (!bodyPaint || !wheels) return null;

  const windows = input.windows;
  const caliper = input.caliper;
  if (
    (windows !== undefined && (typeof windows !== "string" || windows.length > 160)) ||
    (caliper !== undefined && (typeof caliper !== "string" || caliper.length > 160))
  ) {
    return null;
  }

  return {
    bodyPaint,
    wheels,
    ...(typeof windows === "string" ? { windows } : {}),
    ...(typeof caliper === "string" ? { caliper } : {}),
  };
}

async function readStoredModel(id: string) {
  try {
    const raw = await readFile(modelMetadataPath(id), "utf8");
    const storedModel = JSON.parse(raw) as StoredModel;
    return { ...storedModel, modelPath: modelUrl(id) };
  } catch {
    try {
      const model = await stat(modelFilePath(id));
      return {
        id,
        name: "自定义车型",
        fileName: `${id}.glb`,
        fileSize: model.size,
        modelPath: modelUrl(id),
        materialNames: { bodyPaint: [], wheels: [] },
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isModelId(id)) {
    return NextResponse.json({ error: "车型标识无效" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "保存数据格式无效" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "保存数据格式无效" }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  if (typeof input.name !== "string") {
    return NextResponse.json({ error: "车型名称无效" }, { status: 400 });
  }
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const materialNames = parseMaterialNames(input.materialNames);
  if (!name || !materialNames) {
    return NextResponse.json({ error: "车型名称或材质映射无效" }, { status: 400 });
  }

  const storedModel = await readStoredModel(id);
  if (!storedModel) {
    return NextResponse.json({ error: "未找到已上传车型" }, { status: 404 });
  }

  const updated: StoredModel = {
    ...storedModel,
    name,
    materialNames,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(modelMetadataPath(id), JSON.stringify(updated, null, 2));

  return NextResponse.json(updated);
}
