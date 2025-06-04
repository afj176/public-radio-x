import { Pool } from 'pg';

// Help newer versions of pg find the types for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PGHOST?: string;
      PGUSER?: string;
      PGPASSWORD?: string;
      PGDATABASE?: string;
      PGPORT?: string;
      DATABASE_URL?: string; // For services like Heroku or Render
    }
  }
}

const pool = new Pool({
  // Prefer DATABASE_URL if available (common for PaaS)
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'radio_user', // Placeholder, will be set by Docker Compose
  password: process.env.PGPASSWORD || 'radio_password', // Placeholder, will be set by Docker Compose
  database: process.env.PGDATABASE || 'radio_app_db', // Placeholder, will be set by Docker Compose
  port: parseInt(process.env.PGPORT || '5432', 10),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Basic SSL for production if needed
});

pool.on('connect', () => {
  console.log('PostgreSQL pool connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  // Add a helper to get a client from the pool for transactions if needed later
  getClient: () => pool.connect(),
};
