import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { isModelId } from "../route";
import { modelFilePath } from "../../route";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isModelId(id)) {
    return NextResponse.json({ error: "车型标识无效" }, { status: 400 });
  }

  try {
    const filePath = modelFilePath(id);
    const [model, metadata] = await Promise.all([readFile(filePath), stat(filePath)]);
    return new Response(model, {
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(metadata.size),
        "Content-Type": "model/gltf-binary",
      },
    });
  } catch {
    return NextResponse.json({ error: "未找到已上传车型" }, { status: 404 });
  }
}
