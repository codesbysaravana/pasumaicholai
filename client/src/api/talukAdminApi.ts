import { http } from "./http";

export interface TalukAdminRecord {
  id: string;
  username: string;
  talukName: string;
  createdAt: string;
}

export interface CreateTalukAdminInput {
  username: string;
  password: string;
  talukName: string;
}

export interface UpdateTalukAdminInput {
  username: string;
  password?: string;
  talukName: string;
}

export async function getTalukAdmins(): Promise<TalukAdminRecord[]> {
  return http<TalukAdminRecord[]>("/admin/taluk-admin", {
    method: "GET",
  });
}

export async function createTalukAdmin(input: CreateTalukAdminInput): Promise<TalukAdminRecord> {
  return http<TalukAdminRecord>("/admin/taluk-admin", {
    method: "POST",
    body: input,
  });
}

export async function updateTalukAdmin(id: string, input: UpdateTalukAdminInput): Promise<TalukAdminRecord> {
  return http<TalukAdminRecord>(`/admin/taluk-admin/${id}`, {
    method: "PUT",
    body: input,
  });
}

export async function deleteTalukAdmin(id: string): Promise<{ deleted: boolean }> {
  return http<{ deleted: boolean }>(`/admin/taluk-admin/${id}`, {
    method: "DELETE",
  });
}
