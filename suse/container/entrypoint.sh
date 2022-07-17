#!/bin/sh
# Container entrypoint for the SUSE Keyserver
# The following container variables are mandatory: MONGO_HOST MONGO_USER MONGO_PASS MONGO_DB SMTP_HOST SENDER_EMAIL
# The following container variables are optional: MONGO_PORT SMTP_PORT
# Georg Pfuetzenreuter <georg.pfuetzenreuter@suse.com>
set -Ce

config="/etc/sysconfig/keyserver"
servicebin="/usr/bin/node"
serviceargs="/srv/www/keyserver/index.js"
sedbin="/usr/bin/sed"

prepare () {
        set -- \
                'MONGO_HOST' 'MONGO_USER' 'MONGO_PASS' 'MONGO_DB' 'SMTP_HOST' 'SENDER_EMAIL'
        mandatory_settings="$@"

        for setting
        do
                eval var='$'"$1"
                if [ -z "$var" ]
                then
                        echo "Did you forget to define $setting? Aborting startup."
                        exit 1
                fi
        done

        set -- \
                'MONGO_PORT' 'MONGO_URI' 'BIND'
        if [ -n "$SMTP_PORT" ]
        then
                set -- "$@" "SMTP_PORT"
        fi
        optional_settings="$@"

        if [ -n "$MONGO_PORT" ]
        then
                MONGO_URI="$MONGO_HOST:$MONGO_PORT/$MONGO_DB"
        elif [ -z "$MONGO_PORT" ]
        then
                MONGO_URI="$MONGO_HOST/$MONGO_DB"
        fi

        if [ -z "$BIND" ]
        then
                BIND="::"
        fi
}


setup () {

        set -- $mandatory_settings $optional_settings

        for setting
        do
                eval var='$'"$setting"
                construct="$construct -e s?^\($setting=\).*?\1\"$var\"?"
        done

        "$sedbin" '-i' $construct "$config"
        
}

init () {
        prepare
        setup
        set -a
        . "$config"
        NODE_CONFIG_DIR="/etc/keyserver"
        exec "$servicebin" "$serviceargs"
}

init
