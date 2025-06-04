export interface UserFavorite {
  userId: string;
  stationIds: string[];
}

// In-memory store for user favorites
export const userFavorites: UserFavorite[] = [];
