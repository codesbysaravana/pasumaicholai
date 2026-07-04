import { http } from "./http";

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  email: string;
  role: "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery";
  phone?: string | null;
  talukName?: string | null;
}

export async function getUserById(userId: string): Promise<CurrentUserProfile> {
  return http<CurrentUserProfile>(`/users/${userId}`, {
    method: "GET",
  });
}
