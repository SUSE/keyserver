/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2016 Mailvelope GmbH
 * Copyright (C) 2022 SUSE LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const log = require('../app/log');
const util = require('./util');
const openpgp = require('openpgp');

const KEY_BEGIN = '-----BEGIN PGP PUBLIC KEY BLOCK-----';
const KEY_END = '-----END PGP PUBLIC KEY BLOCK-----';

/**
 * A simple wrapper around OpenPGP.js
 */
class PGP {
  constructor() {
    openpgp.config.show_version = false;
    openpgp.config.show_comment = false;
  }

  /**
   * Parse an ascii armored pgp key block and get its parameters.
   * @param  {String} publicKeyArmored   ascii armored pgp key block
   * @return {Object}                    public key document to persist
   */
  async parseKey(publicKeyArmored) {
    publicKeyArmored = this.trimKey(publicKeyArmored);

    log.debug('PGP: Parsing armored key: %s', publicKeyArmored);
    const r = await openpgp.readKeys({armoredKeys: publicKeyArmored});
    if (r.err) {
      const error = r.err[0];
      log.error('PGP: Failed to parse key: %s', error);
      util.throw(500, 'Failed to parse PGP key');
    } else if (!r || r.length !== 1 || !r[0].keyPacket) {
      log.debug('PGP: Attempt to upload more than one key.');
      util.throw(400, 'Invalid PGP key: only one key can be uploaded');
    }

    // verify primary key
    const key = r[0];
    const now = new Date();
    const verifyDate = key.created > now ? key.created : now;
    try {
      await key.verifyPrimaryKey(verifyDate)
    } catch (myerror) {
      if (myerror.message === 'Primary key is expired') {
          log.debug('PGP: Attempt to upload an expired key.');
          util.throw(400, 'Your key has expired, and we only accept valid keys for submission.');
      }
      else if (myerror.message === 'Primary key is revoked') {
          log.debug('PGP: Attempt to upload a revoked key.');
          util.throw(400, 'Your key is marked as revoked, and we only accept valid keys for submission.');
      }
      else {
          log.error('PGP: Key verification error: %s', myerror);
          util.throw(400, 'Key verification failed.');
      }
    }

    // accept version 4 keys only
    const keyId = key.keyPacket.keyID.toHex();
    const fingerprint = key.getFingerprint();
    if (!util.isKeyId(keyId) || !util.isFingerPrint(fingerprint)) {
      log.debug('PGP: Attempt to upload a non-v4 key.');
      util.throw(400, 'Invalid PGP key: only v4 keys are accepted');
    }

    // check for at least one valid user id
    const userIds = await this.parseUserIds(key.users, key.keyPacket, verifyDate);
    if (!userIds.length) {
      log.debug('PGP: Attempt to upload a key with no valid UIDs.');
      util.throw(400, 'Invalid PGP key: invalid user IDs');
    }

    // get algorithm details from primary key
    const keyInfo = key.getAlgorithmInfo();

    // public key document that is stored in the database
    return {
      keyId,
      fingerprint,
      userIds,
      created: key.created,
      uploaded: new Date(),
      algorithm: keyInfo.algorithm,
      keySize: keyInfo.bits,
      publicKeyArmored
    };
  }

  /**
   * Remove all characters before and after the ascii armored key block
   * @param  {string} data   The ascii armored key
   * @return {string}        The trimmed key block
   */
  trimKey(data) {
    if (!this.validateKeyBlock(data)) {
      log.debug('PGP: Attempt to upload something that is no key block.');
      util.throw(400, 'Invalid PGP key: key block not found');
    }
    return KEY_BEGIN + data.split(KEY_BEGIN)[1].split(KEY_END)[0] + KEY_END;
  }

  /**
   * Validate an ascii armored public PGP key block.
   * @param  {string} data   The armored key block
   * @return {boolean}       If the key is valid
   */
  validateKeyBlock(data) {
    if (!util.isString(data)) {
      return false;
    }
    const begin = data.indexOf(KEY_BEGIN);
    const end =  data.indexOf(KEY_END);
    return begin >= 0 && end > begin;
  }

  /**
   * Parse an array of user ids and verify signatures
   * @param  {Array} users   A list of openpgp.js user objects
   * @param {Object} primaryKey The primary key packet of the key
   * @param {Date} verifyDate Verify user IDs at this point in time
   * @return {Array}         An array of user id objects
   */
  async parseUserIds(users, primaryKey, verifyDate = new Date()) {
    if (!users || !users.length) {
      log.debug('PGP: Found key with no UIDs.');
      util.throw(400, 'Invalid PGP key: no user ID found');
    }
    // at least one user id must be valid, revoked or expired
    const result = [];
    for (const user of users) {
      const userStatus = await user.verify(verifyDate, openpgp.config);
      if (userStatus !== 0 && user.userID && user.userID.userID) {
        try {
          const uid = user.userID;
          if (util.isEmail(uid.email)) {
            // map to local user id object format
            result.push({
              status: userStatus,
              name: uid.name,
              email: util.normalizeEmail(uid.email),
              verified: false
            });
          }
        } catch (myerror) {
            log.error('PGP: Failed to parse UIDs: ', myerror);
        }
      }
    }
    return result;
  }

  /**
   * Remove user IDs from armored key block which are not in array of user IDs
   * @param  {Array} userIds  user IDs to be kept
   * @param  {String} armored armored key block to be filtered
   * @return {String}         filtered amored key block
   */
  async filterKeyByUserIds(userIds, armored) {
    const emails = userIds.map(({email}) => email);
    const key = await openpgp.readKey({armoredKey: armored});
    key.users = key.users.filter(({userId}) => !userId || emails.includes(util.normalizeEmail(userId.email)));
    return key.armor();
  }

  /**
   * Merge (update) armored key blocks
   * @param  {String} srcArmored source amored key block
   * @param  {String} dstArmored destination armored key block
   * @return {String}            merged armored key block
   */
  async updateKey(srcArmored, dstArmored) {
    let srcKey;
    let dstKey;
    try {
      log.debug('PGP: Parsing source key for update: %s', srcArmored);
      srcKey = await openpgp.readKey({armoredKey: srcArmored});
    } catch (srcErr) {
      log.error('PGP: Failed to parse source key for update: ', srcErr);
      util.throw(500, 'Failed to parse PGP key');
    }
    try {
      log.debug('PGP: Parsing destination key for update: %s', dstArmored);
      dstKey = await openpgp.readKey({armoredKey: dstArmored});
    } catch (dstErr) {
      log.error('PGP: Failed to parse destination PGP key for update: %s', dstErr);
      util.throw(500, 'Failed to parse PGP key');
    }
    await dstKey.update(srcKey);
    return dstKey.armor();
  }

  /**
   * Remove user ID from armored key block
   * @param  {String} email            email of user ID to be removed
   * @param  {String} publicKeyArmored amored key block to be filtered
   * @return {String}                  filtered armored key block
   */
  async removeUserId(email, publicKeyArmored) {
    const {keys: [key]} = await openpgp.key.readArmored(publicKeyArmored);
    key.users = key.users.filter(({userId}) => !userId || util.normalizeEmail(userId.email) !== email);
    return key.armor();
  }
}

module.exports = PGP;
