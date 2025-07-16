// Article model interface
export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  categoryIds: string[];
  tagIds: string[];
}

export interface CreateArticleRequest {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'published';
  categoryIds?: string[];
  tagIds?: string[];
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  status?: 'draft' | 'published' | 'archived';
  categoryIds?: string[];
  tagIds?: string[];
  clearPublishedAt?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}