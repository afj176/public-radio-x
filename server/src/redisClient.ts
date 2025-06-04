import Redis from 'ioredis';

// Help newer versions of ioredis find the types for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_URL?: string; // For services that provide a single connection string
    }
  }
}

let redisClient: Redis;

try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
        // Common options when using a URL
        lazyConnect: true,
        tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined, // Basic TLS for rediss://
        maxRetriesPerRequest: 3, // Example: Retry a few times
        enableReadyCheck: true,
    });
  } else {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost', // Default to localhost if not set
      port: parseInt(process.env.REDIS_PORT || '6379', 10), // Default Redis port
      password: process.env.REDIS_PASSWORD, // Undefined if not set, which is fine
      lazyConnect: true, // Connect on first command, not immediately
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  redisClient.on('connect', () => {
    console.log('Connected to Redis successfully.');
  });

  redisClient.on('ready', () => {
    console.log('Redis client is ready to use.');
  });

  redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Depending on the app's needs, you might want to implement more robust error handling
    // or attempt to reconnect, though ioredis handles some reconnection automatically.
    // For now, we'll just log the error. The service using this client should handle fallbacks.
  });

  redisClient.on('close', () => {
    console.log('Redis connection closed.');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis client is reconnecting...');
  });

  redisClient.on('end', () => {
    console.log('Redis client connection has ended.');
    // This might happen if all reconnection attempts fail or if explicitly closed.
  });

} catch (e) {
    console.error('Failed to initialize Redis client:', e);
    // Create a mock client if initialization fails, so the app doesn't crash
    // This mock client will not actually cache anything.
    redisClient = {
        get: async () => null,
        set: async () => 'OK',
        on: () => {}, // No-op for event listeners
        status: 'uninitialized_mock', // Custom status to indicate this is a mock
        connect: async () => {}, // no-op connect
    } as any as Redis; // Type assertion to satisfy Redis type, use with caution
    console.warn('Redis client is mocked due to initialization error. Caching will be disabled.');
}


export default redisClient;
