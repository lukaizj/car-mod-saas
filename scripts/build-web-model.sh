#!/usr/bin/env bash

set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <input.glb> <output.glb>" >&2
  exit 64
fi

input=$1
output=$2

if [[ ! -f "$input" ]]; then
  echo "Input file does not exist: $input" >&2
  exit 66
fi

if [[ -e "$output" ]]; then
  echo "Refusing to overwrite an existing output: $output" >&2
  exit 73
fi

output_dir=$(dirname "$output")
mkdir -p "$output_dir"
web_source="$output_dir/.web-model-source.$$.glb"
trap 'rm -f "$web_source"' EXIT

python3 - "$input" "$web_source" <<'PY'
import json
import struct
import sys

source, output = sys.argv[1:]
removed_node_names = {
    "Object_10",  # interior upholstery
    "Object_18",  # interior trim
    "Object_19",  # seats / cabin detail
    "Object_21",  # engine detail hidden by the closed hood
}
runtime_material_names = {
    "Meshesbody151Mtl",
    "Meshesm8rim1Mtl",
    "Meshesm8rim0011Mtl",
}
runtime_material_factors = {
    "Meshesbody151Mtl": [0.9, 0.9, 0.9, 1.0],
    "Meshesm8rim1Mtl": [0.8, 0.8, 0.8, 1.0],
    "Meshesm8rim0011Mtl": [0.7, 0.7, 0.7, 1.0],
}

with open(source, "rb") as model:
    magic, version, _ = struct.unpack("<4sII", model.read(12))
    if magic != b"glTF" or version != 2:
        raise SystemExit(f"Not a glTF 2.0 binary: {source}")

    chunks = []
    while header := model.read(8):
        length, kind = struct.unpack("<I4s", header)
        chunks.append([kind, model.read(length)])

document = json.loads(chunks[0][1].rstrip(b" \x00"))
removed_nodes = {
    index
    for index, node in enumerate(document.get("nodes", []))
    if node.get("name") in removed_node_names
}
if len(removed_nodes) != len(removed_node_names):
    found = {document["nodes"][index].get("name") for index in removed_nodes}
    missing = sorted(removed_node_names - found)
    raise SystemExit(f"Missing removable nodes: {', '.join(missing)}")

for node in document.get("nodes", []):
    if "children" in node:
        node["children"] = [
            child for child in node["children"] if child not in removed_nodes
        ]

stripped_materials = set()
for material in document.get("materials", []):
    if material.get("name") not in runtime_material_names:
        continue
    pbr = material.get("pbrMetallicRoughness", {})
    if pbr.pop("baseColorTexture", None) is not None:
        stripped_materials.add(material["name"])
    pbr["baseColorFactor"] = runtime_material_factors[material["name"]]

if stripped_materials != runtime_material_names:
    missing = sorted(runtime_material_names - stripped_materials)
    raise SystemExit(f"Missing runtime-overridden textures: {', '.join(missing)}")

json_chunk = json.dumps(document, separators=(",", ":")).encode()
json_chunk += b" " * ((4 - len(json_chunk) % 4) % 4)
chunks[0][1] = json_chunk
total_length = 12 + sum(8 + len(data) for _, data in chunks)

with open(output, "wb") as model:
    model.write(struct.pack("<4sII", magic, version, total_length))
    for kind, data in chunks:
        model.write(struct.pack("<I4s", len(data), kind))
        model.write(data)

print(
    f"Prepared web source: removed {len(removed_nodes)} hidden nodes and "
    f"{len(stripped_materials)} runtime-overridden textures."
)
PY

TEXTURE_SIZE=512 "$(dirname "$0")/optimize-model.sh" "$web_source" "$output"
