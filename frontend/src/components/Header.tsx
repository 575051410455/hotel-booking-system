import { Hotel, LogOut, User as UserIcon, Activity } from 'lucide-react';
import type { User } from '@/hooks/auth';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onViewLogs?: () => void;
}

export function Header({ user, onLogout, onViewLogs }: HeaderProps) {
  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      sales: 'bg-blue-100 text-blue-800',
      salescoordinator: 'bg-orange-100 text-orange-800',
      frontoffice: 'bg-green-100 text-green-800',
      housekeeping: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-indigo-100 text-indigo-800',
      staff: 'bg-teal-100 text-teal-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleText = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'ผู้ดูแลระบบ',
      sales: 'ฝ่ายขาย',
      salescoordinator: 'Sales Coordinator',
      frontoffice: 'Front Office',
      housekeeping: 'Housekeeping',
      manager: 'ผู้จัดการ',
      staff: 'พนักงาน',
      user: 'ผู้ใช้งาน',
    };
    return roles[role] || role;
  };

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hotel className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Hotel Booking System</h1>
              <p className="text-sm text-gray-600">ระบบจัดการการจองห้องพัก</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user.role === 'admin' && onViewLogs && (
              <button
                onClick={onViewLogs}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Activity className="w-5 h-5" />
                <span className="hidden sm:inline">Activity Logs</span>
              </button>
            )}
            
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
              <UserIcon className="w-5 h-5 text-gray-600" />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                    {getRoleText(user.role)}
                  </span>
                  {user.department && (
                    <span className="text-xs text-gray-600">{user.department}</span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}