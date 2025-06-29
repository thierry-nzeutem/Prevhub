/**
 * Configuration simplifiée de la base de données
 */
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Configuration PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prevhub',
  user: process.env.DB_USER || 'prevhub_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: false
};

// Pool de connexions PostgreSQL
const pool = new Pool(dbConfig);

// Cache simple en mémoire (remplace Redis temporairement)
const memoryCache = new Map();

const cache = {
  get: async (key) => {
    return memoryCache.get(key) || null;
  },
  set: async (key, value, ttl = 3600) => {
    memoryCache.set(key, value);
    setTimeout(() => memoryCache.delete(key), ttl * 1000);
    return true;
  },
  del: async (key) => {
    memoryCache.delete(key);
    return true;
  },
  exists: async (key) => {
    return memoryCache.has(key);
  }
};

// Test de connexion PostgreSQL uniquement
const testConnections = async () => {
  try {
    const pgClient = await pool.connect();
    const result = await pgClient.query('SELECT NOW()');
    pgClient.release();
    logger.info('✅ Connexion PostgreSQL OK:', result.rows[0].now);
    return true;
  } catch (error) {
    logger.error('❌ Erreur de connexion PostgreSQL:', error);
    return false;
  }
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Requête exécutée', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Erreur de requête:', { text, error: error.message });
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const closeConnections = async () => {
  try {
    await pool.end();
    logger.info('Connexions base de données fermées');
  } catch (error) {
    logger.error('Erreur fermeture connexions:', error);
  }
};

module.exports = {
  pool,
  query,
  transaction,
  cache,
  testConnections,
  closeConnections
};
