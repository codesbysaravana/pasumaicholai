import { http } from "./http";
import type { CreateGrievanceInput, Grievance } from "../types/grievance";

type BackendGrievance = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "submitted" | "in_review" | "resolved";
  createdAt: string;
};

function mapGrievance(item: BackendGrievance): Grievance {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    status: item.status,
    createdAt: item.createdAt,
  };
}

export async function createGrievance(input: CreateGrievanceInput): Promise<Grievance> {
  const data = await http<BackendGrievance>("/grievances", {
    method: "POST",
    body: input,
  });
  return mapGrievance(data);
}

export async function getMyGrievances(): Promise<Grievance[]> {
  const data = await http<BackendGrievance[]>("/grievances/my", {
    method: "GET",
  });
  return data.map(mapGrievance);
}
