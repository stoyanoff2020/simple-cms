// Tag model interface
export interface Tag {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
  createdAt: Date;
}

export interface CreateTagRequest {
  name: string;
}