import express, { Express, Request, Response } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// Simple route for testing
app.get('/', (req: Request, res: Response) => {
  res.send('Radio Streamer Server is running!');
});

// Import station routes
import stationRoutes from './routes/stationRoutes';

// Mount station routes
app.use('/api/stations', stationRoutes);

// Import auth routes
import authRoutes from './routes/authRoutes';

// Mount auth routes
app.use('/api/auth', authRoutes);

// Import favorite routes
import favoriteRoutes from './routes/favoriteRoutes';

// Mount favorite routes
app.use('/api/me/favorites', favoriteRoutes); // Protected by verifyToken middleware in favoriteRoutes.ts

// Import station list routes
import stationListRoutes from './routes/stationListRoutes';

// Mount station list routes
app.use('/api/me/lists', stationListRoutes); // Protected by verifyToken middleware in stationListRoutes.ts


// Generic Error Handling Middleware
// This should be the last middleware added
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.stack || err.message); // Log the full error
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

export default app;
