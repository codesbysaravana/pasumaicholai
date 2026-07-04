import type { GovernmentScheme } from "../types/scheme";
import { http } from "./http";

type BackendScheme = {
  id: string;
  title: string;
  summary: string;
  eligibility: string;
  upvotes: number;
};

function mapScheme(scheme: BackendScheme): GovernmentScheme {
  return {
    id: scheme.id,
    title: scheme.title,
    summary: scheme.summary,
    eligibility: scheme.eligibility,
    upvotes: scheme.upvotes,
  };
}

export async function getSchemes() {
  const data = await http<BackendScheme[]>("/schemes", {
    method: "GET",
  });
  return data.map(mapScheme);
}

export async function getSchemeById(schemeId: string) {
  const data = await http<BackendScheme>(`/schemes/${schemeId}`, {
    method: "GET",
  });
  return mapScheme(data);
}

export async function upvoteScheme(schemeId: string) {
  await http<BackendScheme>(`/schemes/${schemeId}/upvote`, {
    method: "POST",
  });
  return { schemeId, success: true };
}
