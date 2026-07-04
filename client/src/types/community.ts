export interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  upvotes: number;
  createdAt: string;
}

export interface CreateBlogInput {
  title: string;
  content: string;
}
