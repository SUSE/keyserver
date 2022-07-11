#!/bin/sh
# Copyright (C) 2022 SUSE LLC
# Author: Georg Pfuetzenreuter <georg.pfuetzenreuter@suse.com>

set -e
bindir="/opt/keyserver"
confdir="/etc$bindir"
set -a
. "$confdir/environment"
set +a
sudo -Eu keyserver "$bindir/node_modules/.bin/supervisor" --watch "$bindir" -- "$bindir/index.js" --prefix "$bindir"
