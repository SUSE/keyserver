/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2016 Mailvelope GmbH
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

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const config = require('config');
const log = require('./src/app/log');

//
// Start worker cluster depending on number of CPUs
//

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('fork', worker => log.info('Forked worker #%i with PID %i', worker.id, worker.process.pid));
  cluster.on('exit', worker => {
    log.warn('Worker #%i with PID %i died', worker.id, worker.process.pid);
    cluster.fork();
  });
} else {
  require('./src');
}

//
// Error handling
//

process.on('SIGTERM', () => {
  log.warn('Exited on SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  log.warn('Exited on SIGINT');
  process.exit(0);
});

process.on('uncaughtException', err => {
  log.error('Uncaught exception: %s', err);
  process.exit(1);
});
