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

const log = require('./app/log');
const config = require('config');
const init = require('./app');

(async () => {
  try {
    const app = await init();
    app.listen(config.server.port, config.server.bind);
    log.info('Listening on http://%s:%i', config.server.bind, config.server.port);
  } catch (myerror) {
    log.error('Initialization failed: ', myerror);
    throw myerror;
  }
})();
