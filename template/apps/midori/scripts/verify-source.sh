#!/usr/bin/env bash
set -euo pipefail

test -f engine/mach
test -f engine/toolkit/moz.build
test -f engine/browser/config/version_display.txt

echo "Firefox source checkout is ready."
