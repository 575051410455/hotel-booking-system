import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuthStore, ROLE_LABELS, ROLE_COLORS } from "@/hooks/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Phone,
  Building,
  Clock,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: UserComponent,
});

function UserComponent() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปหน้าหลัก
      </Link>
      </div>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800"
                }`}
              >
                {ROLE_LABELS[user.role] || user.role}
              </span>
              {user.isActive ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Inactive
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card className="p-4 rounded-md shadow-md">
            <CardHeader>
              <CardTitle>ข้อมูลส่วนตัว</CardTitle>
              <CardDescription>รายละเอียดบัญชีของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">ชื่อ-นามสกุล</p>
                  <p className="text-sm text-gray-900">{user.fullName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">อีเมล</p>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
              </div>

              {user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">เบอร์โทร</p>
                    <p className="text-sm text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}

              {user.department && (
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">แผนก</p>
                    <p className="text-sm text-gray-900">{user.department}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">ตำแหน่ง</p>
                  <p className="text-sm text-gray-900">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="p-4 rounded-md shadow">
            <CardHeader>
              <CardTitle>สถานะบัญชี</CardTitle>
              <CardDescription>ข้อมูลการใช้งานบัญชี</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Account ID</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                  {user.id}
                </code>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">สถานะ</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      user.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      user.isActive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {user.lastLogin && (
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">เข้าสู่ระบบล่าสุด</p>
                    <p className="text-sm text-gray-900">
                      {new Date(user.lastLogin).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">สมาชิกตั้งแต่</p>
                  <p className="text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">สิทธิ์การใช้งาน</p>
                <p className="text-sm text-gray-600">
                  {user.role === "admin"
                    ? "สิทธิ์ผู้ดูแลระบบ - เข้าถึงได้ทุกส่วน"
                    : user.role === "manager"
                    ? "สิทธิ์ผู้จัดการ - จัดการข้อมูลและผู้ใช้ในแผนก"
                    : user.role === "salescoordinator"
                    ? "สิทธิ์ Sales Coordinator - จัดการการจองและแก้ไขข้อมูล"
                    : user.role === "sales"
                    ? "สิทธิ์ฝ่ายขาย - สร้างและดูการจอง"
                    : user.role === "frontoffice"
                    ? "สิทธิ์ Front Office - จัดการ Check-in/Check-out"
                    : "สิทธิ์การใช้งานทั่วไป"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Information */}
        <Card className="p-4 rounded-md shadow-md">
          <CardHeader>
            <CardTitle>ความปลอดภัย</CardTitle>
            <CardDescription>ข้อมูลความปลอดภัยของบัญชี</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm text-gray-600">รหัสผ่านเข้ารหัสอย่างปลอดภัย</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm text-gray-600">Session tokens ถูกตรวจสอบทุกครั้ง</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm text-gray-600">กิจกรรมบัญชีถูกบันทึก</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}