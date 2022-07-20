SUSE Keyserver
==============

A simple OpenPGP public key server that validates email address ownership of uploaded keys.
This is a fork of the [Mailvelope Keyserver](https://github.com/mailvelope/keyserver) - you can find the original README below.

#### Dependencies

- _Required_: A MongoDB database with read/write access
- _Recommended_: A reverse proxy

#### Install for production

To install this keyserver for production on an SLES or openSUSE system add the OBS repository and install the package:

```
# SLES 15 SP4 or openSUSE Leap 15.4:
zypper ar https://download.opensuse.org/repositories/home:/crameleon:/keyserver/15.4/home:crameleon:keyserver.repo

# openSUSE Tumbleweed:
https://download.opensuse.org/repositories/home:/crameleon:/keyserver/openSUSE_Tumbleweed/home:crameleon:keyserver.repo

# openSUSE for ARM (not tested):
https://download.opensuse.org/repositories/home:/crameleon:/keyserver/openSUSE_Factory_ARM/home:crameleon:keyserver.repo

zypper in keyserver
```

After installation of the package you can configure the program by editing `/etc/sysconfig/keyserver`.

The following options are mandatory:
  - `MONGO_URI`
  - `MONGO_USER`
  - `MONGO_PASS`
  - `SMTP_HOST`

Then the server can be controlled using `systemd`:

```
# Start the daemon
rckeyserver start

# Query the daemon status
rckeyserver status

# Enable the daemon for automatic start during boot
systemctl enable keyserver

# Stop the daemon
rckeyserver stop
```

#### Install for development

To install this server for development purposes, clone the repository and execute:

```
npm i
npm i supervisor
./suse/suse-run-dev.sh
```

#### Screenshots

![Application screenshot - Start page](screenshots/index.html.png?raw=true)
![Application screenshot - Key lookup](screenshots/lookup.png?raw=true)


Mailvelope Keyserver
==============

## Why not use Web of Trust?

There are already OpenPGP key servers like the [SKS keyserver](https://bitbucket.org/skskeyserver/sks-keyserver/wiki/Home) that employ the [Web of Trust](https://en.wikipedia.org/wiki/Web_of_trust) to provide a way to authenticate a user's PGP keys. The problem with these servers are discussed [here](https://en.wikipedia.org/wiki/Key_server_(cryptographic)#Problems_with_keyservers).

### Privacy

The web of trust raises some valid privacy concerns. Not only is a user's social network made public, common SKS servers are also not compliant with the [EU Data Protection Directive](https://en.wikipedia.org/wiki/Data_Protection_Directive) due to lack of key deletion. This key server addresses these issues by not employing the web of trust and by allowing key removal.

### Usability

The main issue with the Web of Trust though is that it does not scale in terms of usability. The goal of this key server is to enable a better user experience for OpenPGP user agents by providing a more reliable source of public keys. Similar to messengers like Signal, users verify their email address by clicking on a link of a PGP encrypted message. This prevents user A from uploading a public key for user B. With this property in place, automatic key lookup is more reliable than with standard SKS servers.

This requires more trust to be placed in the service provider that hosts a key server, but we believe that this trade-off is necessary to improve the user experience for average users. Tech-savvy users or users with a threat model that requires stronger security may still choose to verify PGP key fingerprints just as before.

## Standardization and (De)centralization

The idea is that an identity provider such as an email provider can host their own key directory under a common `openpgpkeys` subdomain. An OpenPGP supporting user agent should attempt to lookup keys under the user's domain e.g. `https://openpgpkeys.example.com` for `user@example.com` first. User agents can host their own fallback key server as well, in case a mail provider does not provide its own key directory.



# Demo

_This section has been removed by the SUSE Keyserver maintainer as the upstream Demo does not match the fork and may lead to confusion. Please refer to the upstream repository if you are interested in a demo of the upstream Mailvelope Keyserver._

# API

The key server provides a modern RESTful API, but is also backwards compatible to the OpenPGP HTTP Keyserver Protocol (HKP). The following properties are enforced by the key server to enable reliable automatic key look in user agents:

* Only public keys with at least one verified email address are served
* There can be only one public key per verified email address at a given time
* A key ID specified in a query must be at least 16 hex characters (64-bit long key ID)
* Key ID collisions are checked upon key upload to prevent collision attacks

## HKP API

The HKP APIs are not documented here. Please refer to the [HKP specification](https://tools.ietf.org/html/draft-shaw-openpgp-hkp-00) to learn more. The server generally implements the full specification, but has some constraints to improve the security for automatic key lookup:

#### Accepted `search` parameters
* Email addresses
* V4 Fingerprints
* Key IDs with 16 digits (64-bit long key ID)

#### Accepted `op` parameters
* get
* index
* vindex

#### Accepted `options` parameters
* mr

## REST API

### Lookup a key

#### By key ID

```
GET /api/v1/key?keyId=b8e4105cc9dedc77
```

#### By fingerprint

```
GET /api/v1/key?fingerprint=e3317db04d3958fd5f662c37b8e4105cc9dedc77
```

#### By email address

```
GET /api/v1/key?email=user@example.com
```

#### Payload (JSON):

```json
{
  "keyId": "b8e4105cc9dedc77",
  "fingerprint": "e3317db04d3958fd5f662c37b8e4105cc9dedc77",
  "userIds": [
    {
      "name": "Jon Smith",
      "email": "jon@smith.com",
      "verified": "true"
    },
    {
      "name": "Jon Smith",
      "email": "jon@organization.com",
      "verified": "false"
    }
  ],
  "created": "Sat Oct 17 2015 12:17:03 GMT+0200 (CEST)",
  "algorithm": "rsa_encrypt_sign",
  "keySize": "4096",
  "publicKeyArmored": "-----BEGIN PGP PUBLIC KEY BLOCK----- ... -----END PGP PUBLIC KEY BLOCK-----"
}
```

* **keyId**: The 16 char key id in hex
* **fingerprint**: The 40 char key fingerprint in hex
* **userIds.name**: The user ID's name
* **userIds.email**: The user ID's email address
* **userIds.verified**: If the user ID's email address has been verified
* **created**: The key creation time as a JavaScript Date
* **algorithm**: The primary key alogrithm
* **keySize**: The key length in bits
* **publicKeyArmored**: The ascii armored public key block

### Upload new key

```
POST /api/v1/key
```

#### Payload (JSON):

```json
{
  "publicKeyArmored": "-----BEGIN PGP PUBLIC KEY BLOCK----- ... -----END PGP PUBLIC KEY BLOCK-----"
}
```

* **publicKeyArmored**: The ascii armored public PGP key to be uploaded

E.g. to upload a key from shell:
```bash
curl https://keys.mailvelope.com/api/v1/key --data "{\"publicKeyArmored\":\"$( \
  gpg --armor --export-options export-minimal --export $GPGKEYID | sed ':a;N;$!ba;s/\n/\\n/g' \
  )\"}" 
```

### Verify uploaded key (via link in email)

```
GET /api/v1/key?op=verify&keyId=b8e4105cc9dedc77&nonce=6a314915c09368224b11df0feedbc53c
```

### Request key removal

```
DELETE /api/v1/key?keyId=b8e4105cc9dedc77 OR ?email=user@example.com
```

### Verify key removal (via link in email)

```
GET /api/v1/key?op=verifyRemove&keyId=b8e4105cc9dedc77&nonce=6a314915c09368224b11df0feedbc53c
```

# Language & DB

The server is written is in JavaScript ES7 and runs on [Node.js](https://nodejs.org/) v8+.

It uses [MongoDB](https://www.mongodb.com/) v3.2+ as its database.


# Getting started

_This section has been removed by the SUSE Keyserver maintainer as the upstream installation instructions conflict with the ones of the fork. Please refer to the upstream [README.md](https://github.com/mailvelope/keyserver/blob/master/README.md) if you are interested in installing the upstream Mailvelope Keyserver._

# License

AGPL v3.0

See the [LICENSE](https://raw.githubusercontent.com/mailvelope/keyserver/master/LICENSE) file for details

## Libraries

Among others, this project relies on the following open source libraries:

* [OpenPGP.js](https://openpgpjs.org/)
* [Nodemailer](https://nodemailer.com/)
* [addressparser](https://github.com/nodemailer/addressparser)
* [koa](http://koajs.com/)
* [mongodb](https://mongodb.github.io/node-mongodb-native/)
