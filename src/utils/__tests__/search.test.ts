import { formatSearchQuery, extractKeywords, calculateRelevance } from '../search';

describe('Search Utilities', () => {
  describe('formatSearchQuery', () => {
    it('should format a simple search query correctly', () => {
      const result = formatSearchQuery('hello world');
      expect(result).toBe('hello:* & world:*');
    });

    it('should handle empty queries', () => {
      expect(formatSearchQuery('')).toBe('');
      expect(formatSearchQuery('   ')).toBe('');
    });

    it('should escape special characters', () => {
      const result = formatSearchQuery('hello & world (test)');
      expect(result).toBe('hello:* & \\&:* & world:* & \\(test\\):*');
    });

    it('should remove duplicate spaces', () => {
      const result = formatSearchQuery('hello   world');
      expect(result).toBe('hello:* & world:*');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const result = extractKeywords('This is a test about keyword extraction');
      expect(result).toContain('test');
      expect(result).toContain('keyword');
      expect(result).toContain('extraction');
      expect(result).not.toContain('is');
      expect(result).not.toContain('a');
      expect(result).not.toContain('about');
    });

    it('should handle empty text', () => {
      expect(extractKeywords('')).toEqual([]);
      expect(extractKeywords('   ')).toEqual([]);
    });

    it('should filter out short words', () => {
      const result = extractKeywords('hi hello world');
      expect(result).not.toContain('hi');
      expect(result).toContain('hello');
      expect(result).toContain('world');
    });

    it('should remove punctuation', () => {
      const result = extractKeywords('hello, world! This is a test.');
      expect(result).toContain('hello');
      expect(result).toContain('world');
      expect(result).toContain('test');
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate higher score for exact matches', () => {
      const exactMatch = calculateRelevance('This is a test about keyword extraction', ['test']);
      const noMatch = calculateRelevance('This is about keyword extraction', ['test']);
      expect(exactMatch).toBeGreaterThan(0);
      expect(noMatch).toBe(0);
    });

    it('should calculate higher score for terms at the beginning', () => {
      const beginningMatch = calculateRelevance('Test document about something', ['test']);
      const endMatch = calculateRelevance('Document about something test', ['test']);
      expect(beginningMatch).toBeGreaterThan(endMatch);
    });

    it('should handle empty inputs', () => {
      expect(calculateRelevance('', ['test'])).toBe(0);
      expect(calculateRelevance('test', [])).toBe(0);
    });

    it('should normalize scores between 0 and 1', () => {
      const score = calculateRelevance('This is a test about keyword extraction', ['test', 'keyword', 'extraction']);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });
});