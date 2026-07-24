#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  echo "Usage: $0 <input.glb> <output.glb>" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 64
fi

input=$1
output=$2
texture_size=${TEXTURE_SIZE:-1024}
model_profile=${MODEL_PROFILE:-m4}

if [[ ! -f "$input" ]]; then
  echo "Input file does not exist: $input" >&2
  exit 66
fi

if [[ "${input##*.}" != "glb" || "${output##*.}" != "glb" ]]; then
  echo "Input and output must both use the .glb extension." >&2
  exit 64
fi

if [[ ! "$texture_size" =~ ^[0-9]+$ ]] || (( texture_size < 64 )); then
  echo "TEXTURE_SIZE must be an integer of at least 64." >&2
  exit 64
fi

input_abs=$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$input")
output_abs=$(python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$output")

if [[ "$input_abs" == "$output_abs" ]]; then
  echo "Refusing to overwrite the input model." >&2
  exit 73
fi

if [[ -e "$output" ]]; then
  echo "Refusing to overwrite an existing output: $output" >&2
  exit 73
fi

output_dir=$(dirname "$output")
mkdir -p "$output_dir"
tmp_output="$output_dir/.optimize-model.$$.glb"
trap 'rm -f "$tmp_output"' EXIT

gltf_transform=(npx --yes @gltf-transform/cli@4.4.1)

check_configurator_names() {
  python3 - "$1" "$model_profile" <<'PY'
import json
import struct
import sys

path, profile = sys.argv[1:]
profiles = {
    "m4": {
        "nodes": {
            "Sketchfab_model",
            "root",
            "GLTF_SceneRootNode",
            "BodyParts_1",
            "WHeelsandrims_2",
        },
        "materials": {
            "Mesheszx1Mtl",
            "Meshesbody151Mtl",
            "Mesheslivery1Mtl",
            "Mesheswindows1Mtl",
            "Caliper1Mtl",
            "Meshesm8rim1Mtl",
            "Meshesm8rim0011Mtl",
        },
    },
    "rs6": {
        "nodes": {
            "Sketchfab_model",
            "root",
            "GLTF_SceneRootNode",
            "Circle.014_149",
            "Circle.024_163",
        },
        "materials": {
            "CARI_PAINT",
            "Glass",
            "Brake_Kit",
            "RIM_DARK",
            "RIM_BRIGHT",
        },
    },
}
if profile not in profiles:
    raise SystemExit(f"Unknown MODEL_PROFILE: {profile}")
required_nodes = profiles[profile]["nodes"]
required_materials = profiles[profile]["materials"]

with open(path, "rb") as model:
    magic, version, _ = struct.unpack("<4sII", model.read(12))
    if magic != b"glTF" or version != 2:
        raise SystemExit(f"Not a glTF 2.0 binary: {path}")
    json_length, json_type = struct.unpack("<I4s", model.read(8))
    if json_type != b"JSON":
        raise SystemExit(f"Missing GLB JSON chunk: {path}")
    document = json.loads(model.read(json_length).rstrip(b" \x00"))

node_names = {node.get("name") for node in document.get("nodes", [])}
material_names = {
    material.get("name") for material in document.get("materials", [])
}
missing_nodes = sorted(required_nodes - node_names)
missing_materials = sorted(required_materials - material_names)

if missing_nodes or missing_materials:
    if missing_nodes:
        print(f"Missing required nodes in {path}: {', '.join(missing_nodes)}", file=sys.stderr)
    if missing_materials:
        print(
            f"Missing required materials in {path}: {', '.join(missing_materials)}",
            file=sys.stderr,
        )
    raise SystemExit(1)

print(
    f"Configurator profile {profile} verified: {len(required_nodes)} nodes, "
    f"{len(required_materials)} materials ({path})"
)
PY
}

check_configurator_names "$input"

"${gltf_transform[@]}" optimize "$input" "$tmp_output" \
  --compress meshopt \
  --flatten false \
  --join false \
  --palette false \
  --simplify false \
  --texture-compress webp \
  --texture-size "$texture_size"

"${gltf_transform[@]}" validate "$tmp_output"
check_configurator_names "$tmp_output"

mv "$tmp_output" "$output"
trap - EXIT

input_size=$(wc -c < "$input" | tr -d '[:space:]')
output_size=$(wc -c < "$output" | tr -d '[:space:]')
input_sha256=$(shasum -a 256 "$input" | awk '{print $1}')
output_sha256=$(shasum -a 256 "$output" | awk '{print $1}')

printf 'Input:  %s bytes  sha256:%s  %s\n' "$input_size" "$input_sha256" "$input"
printf 'Output: %s bytes  sha256:%s  %s\n' "$output_size" "$output_sha256" "$output"
