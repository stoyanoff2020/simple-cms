// Article service unit tests
import { ArticleService } from '../ArticleService';
import { articleRepository } from '../../repositories/ArticleRepository';
import { Article, UpdateArticleRequest } from '../../models/Article';

// Mock the article repository
jest.mock('../../repositories/ArticleRepository');

describe('ArticleService Unit Tests', () => {
  let articleService: ArticleService;
  const mockArticleRepository = articleRepository as jest.Mocked<typeof articleRepository>;

  const mockUser = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    email: 'test@example.com',
    role: 'author'
  };

  const mockDraftArticle: Article = {
    id: '456e7890-e89b-12d3-a456-426614174001',
    title: 'Test Article',
    content: 'This is test content',
    excerpt: 'Test excerpt',
    authorId: mockUser.userId,
    status: 'draft',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    categoryIds: [],
    tagIds: []
  };

  const mockPublishedArticle: Article = {
    ...mockDraftArticle,
    status: 'published',
    publishedAt: new Date('2024-01-01T12:00:00Z')
  };

  const mockArchivedArticle: Article = {
    ...mockDraftArticle,
    status: 'archived'
  };

  beforeEach(() => {
    articleService = new ArticleService();
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish a draft article successfully', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(mockPublishedArticle);

      const result = await articleService.publish(mockDraftArticle.id);

      expect(result).toEqual(mockPublishedArticle);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        status: 'published'
      });
    });

    it('should publish an archived article successfully', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockArchivedArticle);
      mockArticleRepository.update.mockResolvedValue(mockPublishedArticle);

      const result = await articleService.publish(mockArchivedArticle.id);

      expect(result).toEqual(mockPublishedArticle);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockArchivedArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockArchivedArticle.id, {
        status: 'published'
      });
    });

    it('should throw error when article ID is missing', async () => {
      await expect(articleService.publish('')).rejects.toThrow('Article ID is required');
      expect(mockArticleRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when article not found', async () => {
      mockArticleRepository.findById.mockResolvedValue(null);

      await expect(articleService.publish('nonexistent-id')).rejects.toThrow('Article not found');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article is already published', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockPublishedArticle);

      await expect(articleService.publish(mockPublishedArticle.id)).rejects.toThrow('Article is already published');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockPublishedArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article has no title', async () => {
      const articleWithoutTitle = { ...mockDraftArticle, title: '' };
      mockArticleRepository.findById.mockResolvedValue(articleWithoutTitle);

      await expect(articleService.publish(articleWithoutTitle.id)).rejects.toThrow('Cannot publish article without a title');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(articleWithoutTitle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article has no content', async () => {
      const articleWithoutContent = { ...mockDraftArticle, content: '' };
      mockArticleRepository.findById.mockResolvedValue(articleWithoutContent);

      await expect(articleService.publish(articleWithoutContent.id)).rejects.toThrow('Cannot publish article without content');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(articleWithoutContent.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article has whitespace-only title', async () => {
      const articleWithWhitespaceTitle = { ...mockDraftArticle, title: '   ' };
      mockArticleRepository.findById.mockResolvedValue(articleWithWhitespaceTitle);

      await expect(articleService.publish(articleWithWhitespaceTitle.id)).rejects.toThrow('Cannot publish article without a title');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(articleWithWhitespaceTitle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article has whitespace-only content', async () => {
      const articleWithWhitespaceContent = { ...mockDraftArticle, content: '   ' };
      mockArticleRepository.findById.mockResolvedValue(articleWithWhitespaceContent);

      await expect(articleService.publish(articleWithWhitespaceContent.id)).rejects.toThrow('Cannot publish article without content');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(articleWithWhitespaceContent.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when repository update fails', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(null);

      await expect(articleService.publish(mockDraftArticle.id)).rejects.toThrow('Failed to publish article');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        status: 'published'
      });
    });
  });

  describe('unpublish', () => {
    it('should unpublish a published article successfully', async () => {
      const unpublishedArticle = { ...mockPublishedArticle, status: 'draft' as const };
      delete (unpublishedArticle as any).publishedAt;
      mockArticleRepository.findById.mockResolvedValue(mockPublishedArticle);
      mockArticleRepository.update.mockResolvedValue(unpublishedArticle);

      const result = await articleService.unpublish(mockPublishedArticle.id);

      expect(result).toEqual(unpublishedArticle);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockPublishedArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockPublishedArticle.id, {
        status: 'draft'
      });
    });

    it('should throw error when article ID is missing', async () => {
      await expect(articleService.unpublish('')).rejects.toThrow('Article ID is required');
      expect(mockArticleRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when article not found', async () => {
      mockArticleRepository.findById.mockResolvedValue(null);

      await expect(articleService.unpublish('nonexistent-id')).rejects.toThrow('Article not found');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article is not published', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);

      await expect(articleService.unpublish(mockDraftArticle.id)).rejects.toThrow('Article is not published');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to unpublish archived article', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockArchivedArticle);

      await expect(articleService.unpublish(mockArchivedArticle.id)).rejects.toThrow('Article is not published');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockArchivedArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when repository update fails', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockPublishedArticle);
      mockArticleRepository.update.mockResolvedValue(null);

      await expect(articleService.unpublish(mockPublishedArticle.id)).rejects.toThrow('Failed to unpublish article');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockPublishedArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockPublishedArticle.id, {
        status: 'draft'
      });
    });
  });

  describe('archive', () => {
    it('should archive a draft article successfully', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(mockArchivedArticle);

      const result = await articleService.archive(mockDraftArticle.id);

      expect(result).toEqual(mockArchivedArticle);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        status: 'archived'
      });
    });

    it('should archive a published article successfully', async () => {
      const archivedFromPublished = { ...mockPublishedArticle, status: 'archived' as const };
      delete (archivedFromPublished as any).publishedAt;
      mockArticleRepository.findById.mockResolvedValue(mockPublishedArticle);
      mockArticleRepository.update.mockResolvedValue(archivedFromPublished);

      const result = await articleService.archive(mockPublishedArticle.id);

      expect(result).toEqual(archivedFromPublished);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockPublishedArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockPublishedArticle.id, {
        status: 'archived'
      });
    });

    it('should throw error when article ID is missing', async () => {
      await expect(articleService.archive('')).rejects.toThrow('Article ID is required');
      expect(mockArticleRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when article not found', async () => {
      mockArticleRepository.findById.mockResolvedValue(null);

      await expect(articleService.archive('nonexistent-id')).rejects.toThrow('Article not found');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when article is already archived', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockArchivedArticle);

      await expect(articleService.archive(mockArchivedArticle.id)).rejects.toThrow('Article is already archived');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockArchivedArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when repository update fails', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(null);

      await expect(articleService.archive(mockDraftArticle.id)).rejects.toThrow('Failed to archive article');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        status: 'archived'
      });
    });
  });

  describe('saveDraft', () => {
    const draftUpdates: UpdateArticleRequest = {
      title: 'Updated Draft Title',
      content: 'Updated draft content',
      excerpt: 'Updated excerpt'
    };

    it('should save draft successfully with valid updates', async () => {
      const updatedDraft = { ...mockDraftArticle, ...draftUpdates, status: 'draft' as const };
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(updatedDraft);

      const result = await articleService.saveDraft(mockDraftArticle.id, draftUpdates);

      expect(result).toEqual(updatedDraft);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        ...draftUpdates,
        status: 'draft'
      });
    });

    it('should save draft from published article (unpublish)', async () => {
      const draftFromPublished = { ...mockPublishedArticle, ...draftUpdates, status: 'draft' as const };
      delete (draftFromPublished as any).publishedAt;
      mockArticleRepository.findById.mockResolvedValue(mockPublishedArticle);
      mockArticleRepository.update.mockResolvedValue(draftFromPublished);

      const result = await articleService.saveDraft(mockPublishedArticle.id, draftUpdates);

      expect(result).toEqual(draftFromPublished);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockPublishedArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockPublishedArticle.id, {
        ...draftUpdates,
        status: 'draft'
      });
    });

    it('should allow empty title and content for drafts', async () => {
      const emptyUpdates = { title: '', content: '' };
      const updatedDraft = { ...mockDraftArticle, ...emptyUpdates, status: 'draft' as const };
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(updatedDraft);

      const result = await articleService.saveDraft(mockDraftArticle.id, emptyUpdates);

      expect(result).toEqual(updatedDraft);
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        ...emptyUpdates,
        status: 'draft'
      });
    });

    it('should throw error when article ID is missing', async () => {
      await expect(articleService.saveDraft('', draftUpdates)).rejects.toThrow('Article ID is required');
      expect(mockArticleRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw error when article not found', async () => {
      mockArticleRepository.findById.mockResolvedValue(null);

      await expect(articleService.saveDraft('nonexistent-id', draftUpdates)).rejects.toThrow('Article not found');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when title is too long', async () => {
      const longTitle = 'a'.repeat(1001);
      const invalidUpdates = { title: longTitle };
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);

      await expect(articleService.saveDraft(mockDraftArticle.id, invalidUpdates)).rejects.toThrow('Article title is too long (max 1000 characters)');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when content is too long', async () => {
      const longContent = 'a'.repeat(100001);
      const invalidUpdates = { content: longContent };
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);

      await expect(articleService.saveDraft(mockDraftArticle.id, invalidUpdates)).rejects.toThrow('Article content is too long (max 100,000 characters)');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when repository update fails', async () => {
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(null);

      await expect(articleService.saveDraft(mockDraftArticle.id, draftUpdates)).rejects.toThrow('Failed to save draft');
      expect(mockArticleRepository.findById).toHaveBeenCalledWith(mockDraftArticle.id);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        ...draftUpdates,
        status: 'draft'
      });
    });

    it('should override status to draft even if provided in updates', async () => {
      const updatesWithStatus = { ...draftUpdates, status: 'published' as const };
      const updatedDraft = { ...mockDraftArticle, ...draftUpdates, status: 'draft' as const };
      mockArticleRepository.findById.mockResolvedValue(mockDraftArticle);
      mockArticleRepository.update.mockResolvedValue(updatedDraft);

      const result = await articleService.saveDraft(mockDraftArticle.id, updatesWithStatus);

      expect(result).toEqual(updatedDraft);
      expect(mockArticleRepository.update).toHaveBeenCalledWith(mockDraftArticle.id, {
        ...draftUpdates,
        status: 'draft' // Should be overridden to draft
      });
    });
  });
});