/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique identifier for the user (UUID). */
  id: string;
  /** User's email address (used for login). */
  email: string;
  /** Hashed password for the user. */
  passwordHash: string;
}

/**
 * In-memory store for users.
 * @remarks Replace with a database in a real application.
 * @type {User[]}
 */
export const users: User[] = [];
