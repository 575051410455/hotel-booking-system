export interface User {
  id: string;
  username: 'admin' | 'somchai' | 'somying' | 'prasert' | 'wipa' | 'frontoffice' | 'housekeeping';
  password: string;
  fullName: string;
  role: 'admin' | 'sales' | 'salescoordinator' | 'frontoffice' | 'housekeeping';
  email: string;
  phone: string;
  department: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

// Users based on existing salesOwners and staff
const users: User[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    fullName: 'ผู้ดูแลระบบ',
    role: 'admin',
    email: 'admin@hotel.com',
    phone: '02-000-0000',
    department: 'Management',
  },
  {
    id: '2',
    username: 'somchai',
    password: 'som123',
    fullName: 'คุณสมชาย ใจดี',
    role: 'sales',
    email: 'somchai@hotel.com',
    phone: '02-111-1111',
    department: 'Sales',
  },
  {
    id: '3',
    username: 'somying',
    password: 'som123',
    fullName: 'คุณสมหญิง รักงาน',
    role: 'sales',
    email: 'somying@hotel.com',
    phone: '02-222-2222',
    department: 'Sales',
  },
  {
    id: '4',
    username: 'prasert',
    password: 'pra123',
    fullName: 'คุณประเสริฐ มั่นคง',
    role: 'sales',
    email: 'prasert@hotel.com',
    phone: '02-333-3333',
    department: 'Sales',
  },
  {
    id: '5',
    username: 'wipa',
    password: 'wip123',
    fullName: 'คุณวิภา เก่งขาย',
    role: 'salescoordinator',
    email: 'wipa@hotel.com',
    phone: '02-444-4444',
    department: 'Sales Coordinator',
  },
  {
    id: '6',
    username: 'frontoffice',
    password: 'fo123',
    fullName: 'พนักงาน Front Office',
    role: 'frontoffice',
    email: 'fo@hotel.com',
    phone: '02-555-5555',
    department: 'Front Office',
  },
  {
    id: '7',
    username: 'housekeeping',
    password: 'hk123',
    fullName: 'พนักงาน Housekeeping',
    role: 'housekeeping',
    email: 'hk@hotel.com',
    phone: '02-666-6666',
    department: 'Housekeeping',
  },
];

const activityLogs: ActivityLog[] = [];

export const authenticateUser = (username: string, password: string): User | null => {
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

export const getAllUsers = (): User[] => {
  return users.map(u => ({ ...u, password: '***' })); // Hide passwords
};

export const getUserById = (id: string): User | null => {
  const user = users.find(u => u.id === id);
  return user ? { ...user, password: '***' } : null;
};

export const logActivity = (userId: string, userName: string, action: string, details: string): void => {
  activityLogs.push({
    id: String(Date.now()),
    userId,
    userName,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const getActivityLogs = (): ActivityLog[] => {
  return activityLogs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const getActivityLogsByUser = (userId: string): ActivityLog[] => {
  return activityLogs
    .filter(log => log.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};