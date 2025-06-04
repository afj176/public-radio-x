export interface StationList {
  id: string;
  name: string;
  userId: string;
  stationIds: string[];
}

// In-memory store for station lists
export const stationLists: StationList[] = [];
