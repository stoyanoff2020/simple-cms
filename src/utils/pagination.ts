import { PaginationOptions } from '../models/Article';

/**
 * Parse pagination parameters from request query
 */
export function parsePaginationParams(query: any): PaginationOptions {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 10;
  const sortBy = query.sortBy as string || 'created_at';
  const sortOrder = (query.sortOrder as string) || 'desc';

  return {
    page: Math.max(1, page), // Ensure page is at least 1
    limit: Math.min(Math.max(1, limit), 100), // Ensure limit is between 1 and 100
    sortBy,
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc'
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(options: PaginationOptions): { isValid: boolean; error?: string } {
  if (options.page < 1) {
    return { isValid: false, error: 'Page must be greater than or equal to 1' };
  }

  if (options.limit < 1 || options.limit > 100) {
    return { isValid: false, error: 'Limit must be between 1 and 100' };
  }

  const validSortFields = ['created_at', 'updated_at', 'published_at', 'title', 'relevance'];
  if (options.sortBy && !validSortFields.includes(options.sortBy)) {
    return { isValid: false, error: `Invalid sortBy field. Must be one of: ${validSortFields.join(', ')}` };
  }

  const validSortOrders = ['asc', 'desc'];
  if (options.sortOrder && !validSortOrders.includes(options.sortOrder)) {
    return { isValid: false, error: 'Invalid sortOrder. Must be "asc" or "desc"' };
  }

  return { isValid: true };
}

/**
 * Parse date range parameters from request query
 */
export function parseDateRangeParams(query: any): { startDate?: Date; endDate?: Date } {
  const result: { startDate?: Date; endDate?: Date } = {};

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (!isNaN(startDate.getTime())) {
      result.startDate = startDate;
    }
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (!isNaN(endDate.getTime())) {
      result.endDate = endDate;
    }
  }

  return result;
}

/**
 * Build SQL WHERE clause for date range filtering
 */
export function buildDateRangeWhereClause(
  dateField: string,
  startDate?: Date,
  endDate?: Date
): { clause: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  if (startDate) {
    clauses.push(`${dateField} >= $${params.length + 1}`);
    params.push(startDate);
  }

  if (endDate) {
    clauses.push(`${dateField} <= $${params.length + 1}`);
    params.push(endDate);
  }

  if (clauses.length === 0) {
    return { clause: '', params: [] };
  }

  return { clause: clauses.join(' AND '), params };
}