#!/usr/bin/env bash

set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <input.glb> <output.glb>" >&2
  exit 64
fi

MODEL_PROFILE=rs6 TEXTURE_SIZE=512 \
  "$(dirname "$0")/optimize-model.sh" "$1" "$2"
