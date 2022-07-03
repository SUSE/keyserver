#!/bin/sh
set -e
bindir="/opt/keyserver"
confdir="/etc$bindir"
set -a
. "$confdir/environment"
set +a
sudo -Eu keyserver "$bindir/node_modules/.bin/supervisor" --watch "$bindir" -- "$bindir/index.js" --prefix "$bindir"
