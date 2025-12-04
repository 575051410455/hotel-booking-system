export type UserRole = 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  location: string;
  building: string;
  floor: string;
  room: string;
  equipment: string;
  status: 'urgent' | 'pending' | 'in-progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
  notes?: string;
  images?: string[];
}

export type Screen = 'login' | 'dashboard' | 'tasks' | 'task-detail' | 'report-issue' | 'settings';