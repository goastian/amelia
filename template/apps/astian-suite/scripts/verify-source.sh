#!/usr/bin/env bash
set -euo pipefail

test -f engine/mach
test -f engine/comm/mail/moz.build
test -f engine/comm/mail/config/version_display.txt

echo "Thunderbird source checkout is ready."
