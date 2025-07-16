/**
 * Utility functions for search functionality
 */

/**
 * Formats a search query string for PostgreSQL ts_query
 * Handles special characters and adds wildcards for partial matching
 * @param query Raw search query from user input
 * @returns Formatted query string for PostgreSQL ts_query
 */
export function formatSearchQuery(query: string): string {
  if (!query || !query.trim()) {
    return '';
  }

  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(term => {
      // Escape special characters
      const escaped = term.replace(/[&|!():*]/g, '\\$&');
      // Add prefix search capability
      return `${escaped}:*`;
    })
    .join(' & ');
}

/**
 * Extracts keywords from text for search suggestions
 * @param text Text to extract keywords from
 * @returns Array of keywords
 */
export function extractKeywords(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Simple keyword extraction - split by spaces and remove common words
  const commonWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
    'by', 'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between',
    'out', 'of', 'from', 'up', 'down', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.has(word));
}

/**
 * Calculates relevance score based on matched terms and their positions
 * This is a simple implementation for demonstration purposes
 * PostgreSQL's ts_rank handles this more effectively
 * @param text Text to search in
 * @param searchTerms Array of search terms
 * @returns Relevance score between 0 and 1
 */
export function calculateRelevance(text: string, searchTerms: string[]): number {
  if (!text || !searchTerms.length) {
    return 0;
  }

  const lowerText = text.toLowerCase();
  let score = 0;
  
  // Check for each search term
  searchTerms.forEach(term => {
    const lowerTerm = term.toLowerCase();
    
    // Term exists in text
    if (lowerText.includes(lowerTerm)) {
      // Add base score for match
      score += 0.5;
      
      // Bonus for position (terms at beginning are more relevant)
      const position = lowerText.indexOf(lowerTerm);
      const positionScore = Math.max(0, 1 - (position / lowerText.length));
      score += positionScore * 0.3;
      
      // Bonus for exact word match (not just substring)
      const wordBoundaryRegex = new RegExp(`\\b${lowerTerm}\\b`, 'i');
      if (wordBoundaryRegex.test(lowerText)) {
        score += 0.2;
      }
    }
  });
  
  // Normalize score to be between 0 and 1
  return Math.min(1, score / searchTerms.length);
}