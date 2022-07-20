#!BuildTag: gdev/sle-keyserver:latest gdev/sle-keyserver:%PKG_VERSION% gdev/sle-keyserver:%PKG_VERSION%.%RELEASE%

FROM suse/sle15:15.4

MAINTAINER georg.pfuetzenreuter@suse.com

# labelprefix=de.suse.gdev.sle-keyserver
LABEL org.opencontainers.image.title="SLE Keyserver image"
LABEL org.opencontainers.image.description="Keyserver built on top of SLE-BCI for development purposes."
LABEL org.openbuildservice.disturl="%DISTURL%"
LABEL org.opencontainers.image.created="%BUILDTIME%"
LABEL com.suse.eula="sle-bci"
LABEL com.suse.image-type="application"
# endlabelprefix

COPY entrypoint.sh /usr/local/sbin/

RUN set -eu; \
        zypper -n in --no-recommends nodejs16 keyserver; \
        zypper -n clean -a; \
        rm -fr /var/log/*; \
        chmod +x /usr/local/sbin/entrypoint.sh

EXPOSE 8085

ENTRYPOINT ["/usr/local/sbin/entrypoint.sh"]
