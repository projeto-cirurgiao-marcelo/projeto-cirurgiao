import { apiClient, getErrorMessage } from './client';
import type {
  InviteStudentDto,
  InviteStudentResponse,
  StudentsOverviewResponse,
  StudentDetailResponse,
  UpdateUserDto,
  User,
} from '../types/user.types';

export const usersService = {
  async getStudentsOverview(params?: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    sort?: 'recent' | 'name' | 'progress';
    page?: number;
    limit?: number;
  }): Promise<StudentsOverviewResponse> {
    const { data } = await apiClient.get('/users/students/overview', { params });
    return data;
  },

  async getStudentDetail(id: string): Promise<StudentDetailResponse> {
    const { data } = await apiClient.get(`/users/students/${id}`);
    return data;
  },

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const { data } = await apiClient.put(`/users/${id}`, dto);
    return data;
  },

  /** Cria (se preciso) a conta do aluno e gera o convite de criação de senha. */
  async inviteStudent(dto: InviteStudentDto): Promise<InviteStudentResponse> {
    const { data } = await apiClient.post('/auth/invite', dto);
    return data;
  },

  /** Novo link de convite pra aluno já cadastrado que não recebeu/perdeu o acesso. */
  async resendInvite(id: string, sendEmail = true): Promise<InviteStudentResponse> {
    const { data } = await apiClient.post(`/auth/invite/${id}/resend`, { sendEmail });
    return data;
  },
};

export { getErrorMessage };
