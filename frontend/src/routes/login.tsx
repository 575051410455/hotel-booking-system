import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Hotel, Lock, User, AlertCircle, LogIn, Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/hooks/auth";
import { authApi } from "@/hooks/client";

const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const doLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login(email, password);

      if (response.success) {
        setAuth(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );

        toast({
          title: "เข้าสู่ระบบสำเร็จ",
          description: `ยินดีต้อนรับ ${response.data.user.fullName}`,
          variant: "success",
        });

        navigate({ to: "/dashboard" });
      } else {
        setErrorMessage("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        toast({
          title: "เข้าสู่ระบบไม่สำเร็จ",
          description: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
          variant: "destructive",
        });
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

      setErrorMessage(msg);
      toast({
        title: "เข้าสู่ระบบไม่สำเร็จ",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginForm) => {
    await doLogin(data.email, data.password);
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    // fill form
    setValue("email", demoEmail, { shouldValidate: false });
    setValue("password", demoPassword, { shouldValidate: false });

    await doLogin(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
            <Hotel className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hotel Booking System
          </h1>
          <p className="text-gray-600">ระบบจัดการการจองห้องพัก</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="email">
              อีเมล
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                placeholder="example@hotel.com"
                {...register("email")}
                className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-gray-300"
                }`}
              />
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="password">
              รหัสผ่าน
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                placeholder="กรอกรหัสผ่าน"
                {...register("password")}
                className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="w-full text-indigo-600 hover:text-indigo-700 transition-colors text-sm"
            type="button"
          >
            {showDemo ? "ซ่อน" : "แสดง"} บัญชีทดสอบ
          </button>

          {showDemo && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <p className="text-gray-700 mb-3">บัญชีสำหรับทดสอบ:</p>

              <button
                type="button"
                onClick={() =>
                  handleDemoLogin("admin@hotel.com", "admin123")
                }
                className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors"
              >
                <p className="text-gray-900">Admin</p>
                <p className="text-gray-600 text-xs">
                  admin@hotel.com / admin123
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDemoLogin("manager@hotel.com", "manager123")
                }
                className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:border-indigo-300 transition-colors"
              >
                <p className="text-gray-900">Manager</p>
                <p className="text-gray-600 text-xs">
                  manager@hotel.com / manager123
                </p>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-xs">
          <p>© 2025 Hotel Booking System</p>
        </div>
      </div>
    </div>
  );
}
