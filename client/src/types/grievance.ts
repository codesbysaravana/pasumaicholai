export type GrievanceStatus = "submitted" | "in_review" | "resolved";

export interface Grievance {
  id: string;
  title: string;
  description: string;
  category: string;
  status: GrievanceStatus;
  createdAt: string;
}

export interface CreateGrievanceInput {
  title: string;
  description: string;
  category: string;
}
