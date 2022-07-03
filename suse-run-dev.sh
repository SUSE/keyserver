#!/bin/sh
set -e
bindir="/opt/keyserver"
confdir="/etc$bindir"
set -a
. "$confdir/environment"
set +a
sudo -Eu keyserver /usr/bin/npm run --prefix "$bindir" start
