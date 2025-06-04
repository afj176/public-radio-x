// Represents the structure of a station object from the Radio-Browser API
export interface Station {
  changeuuid: string;
  stationuuid: string;
  serveruuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string | null; // Can be an empty string or a URL, or null
  tags: string;           // Comma-separated, can be empty string
  country: string;        // Can be empty string
  countrycode: string;    // Can be empty string
  iso_3166_2: string | null;
  state: string;          // Can be empty string
  language: string;       // Can be empty string
  languagecodes: string;  // Can be empty string
  votes: number;
  lastchangetime: string; // Date string
  lastchangetime_iso8601: string; // ISO 8601 date string
  codec: string;          // Can be empty string
  bitrate: number;
  hls: number; // 0 or 1
  lastcheckok: number; // 0 or 1
  lastchecktime: string; // Date string
  lastchecktime_iso8601: string;
  lastcheckoktime: string; // Date string
  lastcheckoktime_iso8601: string;
  lastlocalchecktime: string; // Date string
  lastlocalchecktime_iso8601: string;
  clicktimestamp: string; // Date string
  clicktimestamp_iso8601: string;
  clickcount: number;
  clicktrend: number;
  ssl_error: number; // 0 or 1
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info: boolean;
}
