import type { BlogPost, CreateBlogInput } from "../types/community";
import { http } from "./http";

type BackendBlog = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  upvotes: number;
  createdAt: string;
};

function mapBlog(blog: BackendBlog): BlogPost {
  return {
    id: blog.id,
    title: blog.title,
    content: blog.content,
    authorName: blog.authorName,
    authorId: blog.authorId,
    upvotes: blog.upvotes,
    createdAt: blog.createdAt,
  };
}

export async function getBlogs() {
  const data = await http<BackendBlog[]>("/community", {
    method: "GET",
  });
  return data.map(mapBlog);
}

export async function getBlogById(blogId: string) {
  const data = await http<BackendBlog>(`/community/${blogId}`, {
    method: "GET",
  });
  return mapBlog(data);
}

export async function createBlog(input: CreateBlogInput): Promise<BlogPost> {
  const data = await http<BackendBlog>("/community", {
    method: "POST",
    body: input,
  });
  return mapBlog(data);
}

export async function upvoteBlog(blogId: string) {
  await http<BackendBlog>(`/community/${blogId}/upvote`, {
    method: "POST",
  });
  return { blogId, success: true };
}
