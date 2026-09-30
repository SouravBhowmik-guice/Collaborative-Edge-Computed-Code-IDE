#!/usr/bin/env node
/**
 * Wait for PostgreSQL to be ready
 * Usage: node scripts/wait-for-postgres.mjs [host] [port]
 */

import net from 'net';

const HOST = process.argv[2] || 'localhost';
const PORT = parseInt(process.argv[3]) || 5432;
const RETRIES = 30;
const DELAY = 1000;

async function tryConnect() {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    }, 3000);

    socket.connect(PORT, HOST, () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function main() {
  console.log(`⏳ Waiting for PostgreSQL at ${HOST}:${PORT}...`);

  for (let i = 1; i <= RETRIES; i++) {
    try {
      await tryConnect();
      console.log(`✅ PostgreSQL is ready at ${HOST}:${PORT}`);
      process.exit(0);
    } catch (err) {
      console.log(`   Attempt ${i}/${RETRIES} failed, retrying in ${DELAY}ms...`);
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  console.error(`❌ PostgreSQL at ${HOST}:${PORT} did not become ready after ${RETRIES} attempts`);
  process.exit(1);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});