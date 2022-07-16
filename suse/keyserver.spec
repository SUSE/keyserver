#
# spec file for package keyserver.spec
#
# Copyright (c) 2022 SUSE LLC
#
# All modifications and additions to the file contributed by third parties
# remain the property of their copyright owners, unless otherwise agreed
# upon. The license for this file, and modifications and additions to the
# file, is the same license as for the pristine package itself (unless the
# license for the pristine package is not an Open Source License, in which
# case the license is the MIT License). An "Open Source License" is a
# license that conforms to the Open Source Definition (Version 1.9)
# published by the Open Source Initiative.

# Please submit bugfixes or comments via https://bugs.opensuse.org/
#


%define install_dir /srv/www/%{name}
%define modules_dir node_modules
Name:           keyserver
Version:        1.2
Release:        0
Summary:        Simple OpenPGP public key server
License:        AGPL-3.0-only
Group:          Productivity/Networking/Other
URL:            https://github.com/SUSE/keyserver
Source0:        suse-v%{version}.tar.gz
Source1:        node_modules.tgz
Source2:        system-user-keyserver.conf
Patch0:         suse-config.patch
BuildRequires:  fdupes
BuildRequires:  nodejs
BuildRequires:  rsync
BuildRequires:  sysuser-tools
BuildArch:      noarch
Suggests:       nginx postfix
%sysusers_requires

%description
A simple OpenPGP public key server that validates email address ownership of uploaded keys.
This is a fork of the Mailvelope Keyserver.

%prep
%setup -q -b 1 -n %{modules_dir} -T
%autosetup -D -n %{name}-suse-v%{version} -p 1
cd ..
mv %{modules_dir} %{name}-suse-v%{version}/
rm %{name}-suse-v%{version}/%{modules_dir}/form-data/README.md.bak
find %{name}-suse-v%{version}/%{modules_dir} -name '.*' -exec rm -r {} +
find %{name}-suse-v%{version}/%{modules_dir} -type f -exec sed -i -e '\?%{_bindir}/env node?d' -e '\?%{_bindir}/env sh?d' -e '\?%{_bindir}/env bash?d' {} + -exec chmod 644 {} +

%build
%sysusers_generate_pre %{SOURCE2} %{name}

%install
install -d %{buildroot}%{install_dir} %{buildroot}%{_fillupdir} %{buildroot}/%{_unitdir} %{buildroot}/%{_sbindir} %{buildroot}/%{_sysconfdir}/%{name} %{buildroot}%{_sysusersdir} %{buildroot}/%{_sysconfdir}/nginx/vhosts.d
rsync -a index.js locales node_modules static src %{buildroot}%{install_dir}
install -v -m 644 %{SOURCE2} %{buildroot}%{_sysusersdir}
install -v -m 644 config/default.js %{buildroot}%{_sysconfdir}/%{name}/production.js
install -v -m 644 suse/sysconfig %{buildroot}%{_fillupdir}/sysconfig.keyserver
install -v -m 644 suse/%{name}.service %{buildroot}%{_unitdir}
ln -s -f %{_sbindir}/service %{buildroot}%{_sbindir}/rc%{name}
install -v -m 644 suse/keyserver.conf %{buildroot}/%{_sysconfdir}/nginx/vhosts.d
%fdupes %{buildroot}%{install_dir}

%pre
%service_add_pre %{name}.service

%post
%{fillup_only -n %{name}}
%service_add_post %{name}.service

%preun
%service_del_preun %{name}.service

%postun
%service_del_postun %{name}.service

%files
%license LICENSE
%doc README.md
%{install_dir}/
%dir %{_sysconfdir}/%{name}/
%dir %{_sysconfdir}/nginx
%dir %{_sysconfdir}/nginx/vhosts.d
%{_sysusersdir}/system-user-keyserver.conf
%{_fillupdir}/sysconfig.%{name}
%{_unitdir}/%{name}.service
%{_sbindir}/rc%{name}
%config(noreplace) %attr(0640,root,%{name}) %{_sysconfdir}/%{name}/production.js
%config(noreplace) %attr(0640,root,%{name}) %{_sysconfdir}/nginx/vhosts.d/%{name}.conf

%changelog
