// Search service interface
import { Article } from '../models';

export interface SearchFilters {
  categoryIds?: string[];
  tagIds?: string[];
  authorId?: string;
  status?: 'draft' | 'published' | 'archived';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchResult {
  article: Article;
  relevanceScore: number;
  matchedFields: string[];
}

export interface SearchService {
  searchArticles(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  indexArticle(article: Article): Promise<void>;
  removeFromIndex(articleId: string): Promise<void>;
  getSuggestions(partialQuery: string): Promise<string[]>;
}