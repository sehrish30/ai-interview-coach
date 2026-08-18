/**
 * Convenience aliases on top of the generated src/types/database.ts.
 * Kept in a separate file because database.ts is regenerated wholesale by
 * `npm run db:types` and would silently drop any hand-added exports.
 */
import type { Enums } from "./database";

export type SessionStatus = Enums<"session_status">;
