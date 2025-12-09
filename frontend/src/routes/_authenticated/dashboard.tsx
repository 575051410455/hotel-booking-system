// src/routes/dashboard.tsx
import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";

import {
  Hotel,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Search,
  Table,
  Edit,
} from "lucide-react";

import { getBookings, roomTypes } from "@/data/mockData";
import type { User } from "@/data/users";
import { useAuthStore } from "@/hooks/auth";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { 
  IconUsers, 
  IconActivity, 
  IconLogin, 
  IconShield,
  IconTrendingUp,
  IconBuildingSkyscraper,
  IconCurrencyDollar,
  IconCalendarEvent,
  IconBed,
} from "@tabler/icons-react";


import { 
  Card, 
  CardAction,

  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


type Menu = "check" | "book" | "confirm" | "amend" | "table";

interface DashboardProps {
  onNavigate: (menu: Menu) => void;
  currentUser: User;
}

// ---------- TanStack Route Wrapper ----------
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user)!;

  const handleNavigate = (menu: Menu) => {
    // ปรับ path ตามโครงจริงของโปรเจ็กต์ได้เลย
    switch (menu) {
      case "check":
        navigate({ to: "/availability" });
        break;
      case "book":
        navigate({ to: "/bookings/new" });
        break;
      case "confirm":
        navigate({ to: "/bookings/confirm" });
        break;
      case "amend":
        navigate({ to: "/bookings/amend" });
        break;
      case "table":
        navigate({ to: "/bookings" });
        break;
    }
  };

  return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />;
}

// ---------- UI หลักของ Dashboard ----------
export function Dashboard({ onNavigate, currentUser }: DashboardProps) {
  const bookings = getBookings();
  const COLORS = ["#fbbf24", "#34d399", "#f87171"];

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const cancelled = bookings.filter(
      (b) => b.status === "CANCELLED" || b.status === "VOID"
    ).length;
    const total = bookings.length;

    // Calculate revenue (only CONFIRMED)
    const revenue = bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => {
        const nights = Math.ceil(
          (new Date(b.checkOut).getTime() -
            new Date(b.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return sum + b.rate * b.numberOfRooms * nights;
      }, 0);

    // Today's check-ins
    const todayCheckIns = bookings.filter((b) => {
      const checkIn = new Date(b.checkIn);
      checkIn.setHours(0, 0, 0, 0);
      return (
        checkIn.getTime() === today.getTime() &&
        (b.status === "CONFIRMED" || b.status === "PENDING")
      );
    }).length;

    // Today's check-outs
    const todayCheckOuts = bookings.filter((b) => {
      const checkOut = new Date(b.checkOut);
      checkOut.setHours(0, 0, 0, 0);
      return checkOut.getTime() === today.getTime() && b.status === "CONFIRMED";
    }).length;

    // Calculate occupancy
    const totalRooms = roomTypes.reduce(
      (sum, rt) => sum + rt.totalRooms,
      0
    );
    const occupiedRooms = bookings
      .filter((b) => {
        if (b.status !== "CONFIRMED" && b.status !== "PENDING") return false;
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return today >= checkIn && today < checkOut;
      })
      .reduce((sum, b) => sum + b.numberOfRooms, 0);

    const occupancyRate =
      totalRooms > 0
        ? ((occupiedRooms / totalRooms) * 100).toFixed(1)
        : "0";

    return {
      total,
      pending,
      confirmed,
      cancelled,
      revenue,
      todayCheckIns,
      todayCheckOuts,
      occupancyRate,
      occupiedRooms,
      totalRooms,
    };
  }, [bookings]);

  // Room type distribution
  const roomTypeData = useMemo(() => {
    const distribution: { [key: string]: number } = {};

    bookings
      .filter((b) => b.status === "CONFIRMED" || b.status === "PENDING")
      .forEach((b) => {
        distribution[b.roomType] =
          (distribution[b.roomType] || 0) + b.numberOfRooms;
      });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
    }));
  }, [bookings]);

  // Booking status chart data
  const statusData = [
    { name: "Pending", value: stats.pending, color: "#fbbf24" },
    { name: "Confirmed", value: stats.confirmed, color: "#34d399" },
    { name: "Cancelled", value: stats.cancelled, color: "#f87171" },
  ];

  // Recent bookings
  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [bookings]);

  // Upcoming check-ins (next 7 days)
  const upcomingCheckIns = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    return bookings
      .filter((b) => {
        const checkIn = new Date(b.checkIn);
        return (
          checkIn >= today &&
          checkIn <= nextWeek &&
          (b.status === "CONFIRMED" || b.status === "PENDING")
        );
      })
      .sort(
        (a, b) =>
          new Date(a.checkIn).getTime() -
          new Date(b.checkIn).getTime()
      )
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Hotel className="w-10 h-10 text-indigo-600" />
              <div>
                <h1 className="text-gray-900">Hotel Booking Dashboard</h1>
                <p className="text-gray-600">ระบบจัดการการจองห้องพัก</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-600">วันที่</p>
              <p className="text-gray-900">
                {new Date().toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => onNavigate("check")}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-indigo-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Search className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-600">เช็คห้องว่าง</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("book")}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-600">จองห้องพัก</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("confirm")}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-600">คอนเฟิร์มห้อง</p>
                {stats.pending > 0 && (
                  <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs mt-1">
                    {stats.pending} รอดำเนินการ
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("amend")}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Edit className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-600">แก้ไขการจอง</p>
                {(currentUser.role === "salescoordinator" ||
                  currentUser.role === "admin") && (
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs mt-1">
                    Sales-Co
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("table")}
            className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Table className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="text-gray-600">ตารางการจอง</p>
              </div>
            </div>
          </button>
        </div>

        {/* Statistics Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 mb-1">การจองทั้งหมด</p>
            <p className="text-gray-900">{stats.total}</p>
            <div className="mt-3 flex gap-2">
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                Pending: {stats.pending}
              </span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                Confirmed: {stats.confirmed}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 mb-1">รายได้ทั้งหมด</p>
            <p className="text-gray-900">
              ฿{stats.revenue.toLocaleString()}
            </p>
            <p className="text-green-600 mt-2">จากการจองที่ยืนยันแล้ว</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Hotel className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <p className="text-purple-600">
                  {stats.occupancyRate}%
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-1">อัตราการเข้าพัก</p>
            <p className="text-gray-900">
              {stats.occupiedRooms} / {stats.totalRooms} ห้อง
            </p>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.occupancyRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-gray-600 mb-1">วันนี้</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-gray-900">
                  {stats.todayCheckIns}
                </p>
                <p className="text-gray-600">Check-in</p>
              </div>
              <div className="h-10 w-px bg-gray-300" />
              <div>
                <p className="text-gray-900">
                  {stats.todayCheckOuts}
                </p>
                <p className="text-gray-600">Check-out</p>
              </div>
            </div>
          </div> 
        </div> */} 

      {/* Hotel Stats Cards - SectionCards Style */}
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-sm md:grid-cols-2 xl:grid-cols-4 mb-8">
        {/* Total Bookings */}
        <Card className="@container/card rounded-xl shadow p-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <IconCalendarEvent className="size-4" />
              การจองทั้งหมด
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.total}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <IconTrendingUp className="size-3" />
                +12.5%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                รอดำเนินการ: {stats.pending}
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                ยืนยันแล้ว: {stats.confirmed}
              </Badge>
            </div>
          </CardFooter>
        </Card>

        {/* Revenue */}
        <Card className="@container/card rounded-xl shadow p-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <IconCurrencyDollar className="size-4" />
              รายได้ทั้งหมด
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              ฿{stats.revenue.toLocaleString()}
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <IconTrendingUp className="size-3" />
                +8.2%
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium text-green-600">
              เพิ่มขึ้นจากเดือนที่แล้ว <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              จากการจองที่ยืนยันแล้ว
            </div>
          </CardFooter>
        </Card>

        {/* Occupancy Rate */}
        <Card className="@container/card rounded-xl shadow p-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <IconBed className="size-4" />
              อัตราการเข้าพัก
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.occupancyRate}%
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                <IconBuildingSkyscraper className="size-3" />
                {stats.occupiedRooms}/{stats.totalRooms}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">ห้องที่ถูกจอง</span>
                <span className="font-medium">{stats.occupiedRooms} ห้อง</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.occupancyRate}%` }}
                />
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Today Check-in/out */}
        <Card className="@container/card rounded-xl shadow p-3">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <IconUsers className="size-4" />
              วันนี้
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {stats.todayCheckIns + stats.todayCheckOuts} รายการ
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                <IconActivity className="size-3" />
                Active
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1">
                <p className="text-2xl font-bold text-green-600">{stats.todayCheckIns}</p>
                <p className="text-muted-foreground text-xs">Check-in</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="flex-1">
                <p className="text-2xl font-bold text-blue-600">{stats.todayCheckOuts}</p>
                <p className="text-muted-foreground text-xs">Check-out</p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Booking Status Chart */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-900 mb-4">สถานะการจอง</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Room Type Distribution */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-900 mb-4">
              การจองตามประเภทห้อง
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={roomTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  name="จำนวนห้อง"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Bookings and Upcoming Check-ins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Bookings */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-900 mb-4">การจองล่าสุด</h2>
            <div className="space-y-3">
              {recentBookings.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  ยังไม่มีการจอง
                </p>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900">
                          {booking.bookingId}
                        </p>
                        <p className="text-gray-600">
                          {booking.customerName}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          booking.status === "CONFIRMED"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600">
                      <span>{booking.checkIn}</span>
                      <span>→</span>
                      <span>{booking.checkOut}</span>
                      <span className="ml-auto">
                        {booking.numberOfRooms} ห้อง
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Check-ins */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-gray-900 mb-4">
              Check-in ที่กำลังจะมาถึง (7 วันข้างหน้า)
            </h2>
            <div className="space-y-3">
              {upcomingCheckIns.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  ไม่มี Check-in ที่กำลังจะมาถึง
                </p>
              ) : (
                upcomingCheckIns.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-gray-900">
                          {booking.bookingId}
                        </p>
                        <p className="text-gray-600">
                          {booking.customerName}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs ${
                          booking.status === "CONFIRMED"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{booking.checkIn}</span>
                      </div>
                      <span className="ml-auto">
                        {booking.roomType}
                      </span>
                      <span>{booking.numberOfRooms} ห้อง</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
