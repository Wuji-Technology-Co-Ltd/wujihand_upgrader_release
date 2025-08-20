#!/bin/bash
# Release mode startup script
export WUJI_MODE=release
cd "$(dirname "$0")"  # 切换到脚本所在目录
node run.js
