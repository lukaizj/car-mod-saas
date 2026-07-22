"use client";

import ReactDOM from "react-dom";
import { DEFAULT_VEHICLE } from "@/lib/catalog";

export default function PreloadCarModel() {
  ReactDOM.preload(DEFAULT_VEHICLE.modelPath, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "high",
    type: "model/gltf-binary",
  });

  return null;
}
