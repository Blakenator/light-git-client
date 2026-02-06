import { DiffHeaderModel } from './diff.header.model';

export interface PaginatedDiffResponse {
  /** The diff items for the current page */
  items: DiffHeaderModel[];
  /** Cursor to pass for the next page, or null if no more pages */
  nextCursor: string | null;
  /** Whether there are more files beyond this page */
  hasMore: boolean;
}
