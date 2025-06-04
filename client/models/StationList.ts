import { Station } from './Station'; // Assuming Station model is already defined

export interface StationList {
  id: string;
  name: string;
  userId: string; // Keep for consistency, though client context is user-specific
  stationIds: string[];
  // Optional: client-side might want to store full station objects here too
  // stations?: Station[];
}
