import axios from 'axios';
import redisClient from '../redisClient'; // Import the Redis client

const BASE_URL = 'https://de1.api.radio-browser.info/json';
const CACHE_EXPIRATION_SECONDS = 3600; // 1 hour

interface Station {
  changeuuid: string;
  stationuuid: string;
  serveruuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  iso_3166_2: any;
  state: string;
  language: string;
  languagecodes: string;
  votes: number;
  lastchangetime: string;
  lastchangetime_iso8601: string;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime: string;
  lastchecktime_iso8601: string;
  lastcheckoktime: string;
  lastcheckoktime_iso8601: string;
  lastlocalchecktime: string;
  lastlocalchecktime_iso8601: string;
  clicktimestamp: string;
  clicktimestamp_iso8601: string;
  clickcount: number;
  clicktrend: number;
  ssl_error: number;
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info: boolean;
}

/**
 * Fetches a list of radio stations from the Radio-Browser API.
 * @param limit The maximum number of stations to fetch. Defaults to 100.
 * @param name Optional name to filter stations by.
 * @param tag Optional tag (genre) to filter stations by.
 * @returns A promise that resolves to an array of station objects.
 */
export const getStations = async (
  limit: number = 100,
  name?: string,
  tag?: string
): Promise<Station[]> => {
  const cacheKey = `radioStations:limit=${limit}:name=${name || ''}:tag=${tag || ''}`;

  // Try fetching from cache first
  try {
    if (redisClient.status === 'ready' || redisClient.status === 'connecting' || redisClient.status === 'reconnecting') {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return JSON.parse(cachedData) as Station[];
      }
      console.log(`Cache miss for key: ${cacheKey}`);
    } else {
        console.warn(`Redis not ready (status: ${redisClient.status}), skipping cache for key: ${cacheKey}`);
    }
  } catch (redisError) {
    console.error(`Redis GET error for key ${cacheKey}:`, redisError);
    // Fall through to API fetch if Redis GET fails
  }

  // If not in cache or Redis error, fetch from API
  try {
    let apiUrl = `${BASE_URL}/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true`;
    if (name) apiUrl += `&name=${encodeURIComponent(name)}`;
    if (tag) apiUrl += `&tag=${encodeURIComponent(tag)}`;

    const response = await axios.get<Station[]>(apiUrl);
    const stationsData = response.data;

    // Store in cache
    try {
      if (redisClient.status === 'ready') {
        await redisClient.set(cacheKey, JSON.stringify(stationsData), 'EX', CACHE_EXPIRATION_SECONDS);
        console.log(`Cached data for key: ${cacheKey}`);
      } else {
        console.warn(`Redis not ready (status: ${redisClient.status}), skipping SET cache for key: ${cacheKey}`);
      }
    } catch (redisError) {
      console.error(`Redis SET error for key ${cacheKey}:`, redisError);
      // Do not let Redis SET error fail the main API response
    }

    return stationsData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching stations from Radio-Browser API:', error.message);
      // Potentially handle specific error codes, like error.response?.status
    } else {
      console.error('An unexpected error occurred:', error);
    }
    return []; // Return an empty array or throw a custom error
  }
};
