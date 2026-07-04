import { http } from "./http";

type BackendUserRole = "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery";

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  role: BackendUserRole;
  phone?: string | null;
  specialization?: string | null;
  status?: "active" | "busy" | "offline";
}

export interface ExpertRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  status: "active" | "busy" | "offline";
}

function mapExpert(user: BackendUser): ExpertRecord {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    specialization: user.specialization ?? null,
    status: user.status ?? "active",
  };
}

export async function getExperts(): Promise<ExpertRecord[]> {
  const users = await http<BackendUser[]>("/users", {
    method: "GET",
  });

  return users.filter((user) => user.role === "expert").map(mapExpert);
}
