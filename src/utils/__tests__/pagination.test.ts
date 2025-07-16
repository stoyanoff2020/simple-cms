import { 
  parsePaginationParams, 
  validatePaginationParams, 
  parseDateRangeParams, 
  buildDateRangeWhereClause 
} from '../pagination';

describe('Pagination Utilities', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid pagination parameters', () => {
      const query = {
        page: '2',
        limit: '20',
        sortBy: 'title',
        sortOrder: 'asc'
      };

      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 2,
        limit: 20,
        sortBy: 'title',
        sortOrder: 'asc'
      });
    });

    it('should use default values for missing parameters', () => {
      const query = {};

      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should enforce minimum page value', () => {
      const query = {
        page: '-1'
      };

      const result = parsePaginationParams(query);

      expect(result.page).toBe(1);
    });

    it('should enforce limit range', () => {
      const query = {
        limit: '200'
      };

      const result = parsePaginationParams(query);

      expect(result.limit).toBe(100);
    });

    it('should handle non-numeric values', () => {
      const query = {
        page: 'abc',
        limit: 'xyz'
      };

      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate correct parameters', () => {
      const options = {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc' as 'asc' | 'desc'
      };

      const result = validatePaginationParams(options);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid page number', () => {
      const options = {
        page: 0,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'desc' as 'asc' | 'desc'
      };

      const result = validatePaginationParams(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Page must be greater');
    });

    it('should reject invalid limit', () => {
      const options = {
        page: 1,
        limit: 101,
        sortBy: 'created_at',
        sortOrder: 'desc' as 'asc' | 'desc'
      };

      const result = validatePaginationParams(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Limit must be between');
    });

    it('should reject invalid sortBy field', () => {
      const options = {
        page: 1,
        limit: 10,
        sortBy: 'invalid_field',
        sortOrder: 'desc' as 'asc' | 'desc'
      };

      const result = validatePaginationParams(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid sortBy field');
    });

    it('should reject invalid sortOrder', () => {
      const options = {
        page: 1,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'invalid' as 'asc' | 'desc'
      };

      const result = validatePaginationParams(options);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid sortOrder');
    });
  });

  describe('parseDateRangeParams', () => {
    it('should parse valid date range parameters', () => {
      const query = {
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const result = parseDateRangeParams(query);

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.startDate?.getFullYear()).toBe(2023);
      expect(result.startDate?.getMonth()).toBe(0); // January is 0
      expect(result.endDate?.getFullYear()).toBe(2023);
      expect(result.endDate?.getMonth()).toBe(11); // December is 11
    });

    it('should handle missing date parameters', () => {
      const query = {};

      const result = parseDateRangeParams(query);

      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should handle invalid date formats', () => {
      const query = {
        startDate: 'not-a-date',
        endDate: 'also-not-a-date'
      };

      const result = parseDateRangeParams(query);

      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
    });

    it('should handle partial date range', () => {
      const query = {
        startDate: '2023-01-01'
      };

      const result = parseDateRangeParams(query);

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeUndefined();
    });
  });

  describe('buildDateRangeWhereClause', () => {
    it('should build WHERE clause with both start and end dates', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const dateField = 'published_at';

      const result = buildDateRangeWhereClause(dateField, startDate, endDate);

      expect(result.clause).toBe('published_at >= $1 AND published_at <= $2');
      expect(result.params).toEqual([startDate, endDate]);
    });

    it('should build WHERE clause with only start date', () => {
      const startDate = new Date('2023-01-01');
      const dateField = 'published_at';

      const result = buildDateRangeWhereClause(dateField, startDate);

      expect(result.clause).toBe('published_at >= $1');
      expect(result.params).toEqual([startDate]);
    });

    it('should build WHERE clause with only end date', () => {
      const endDate = new Date('2023-12-31');
      const dateField = 'published_at';

      const result = buildDateRangeWhereClause(dateField, undefined, endDate);

      expect(result.clause).toBe('published_at <= $1');
      expect(result.params).toEqual([endDate]);
    });

    it('should return empty clause when no dates provided', () => {
      const dateField = 'published_at';

      const result = buildDateRangeWhereClause(dateField);

      expect(result.clause).toBe('');
      expect(result.params).toEqual([]);
    });
  });
});