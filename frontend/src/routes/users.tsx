import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  UserCheck,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore, ROLE_LABELS, type User, type Role } from "@/hooks/auth";
import { usersApi } from "@/hooks/client";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export const Route = createFileRoute("/users")({
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user || !["admin", "manager"].includes(user.role)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: UsersPage,
});

const createUserSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  role: z.enum(["admin", "manager", "staff", "user", "sales", "salescoordinator", "frontoffice", "housekeeping"]),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  fullName: z.string().min(2, "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร"),
  role: z.enum(["admin", "manager", "staff", "user", "sales", "salescoordinator", "frontoffice", "housekeeping"]),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "admin";

  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["users", page, search, roleFilter, statusFilter],
    queryFn: () =>
      usersApi.getUsers({
        page,
        limit: 10,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter === "true",
      }) as Promise<{
        success: boolean;
        data: {
          users: User[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        };
      }>,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateDialogOpen(false);
      createForm.reset();
      toast({ title: "สร้างผู้ใช้สำเร็จ", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserForm }) =>
      usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
      toast({ title: "แก้ไขผู้ใช้สำเร็จ", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({ title: "ลบผู้ใช้สำเร็จ", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "เปลี่ยนสถานะสำเร็จ", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => {
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      resetPasswordForm.reset();
      toast({ title: "รีเซ็ตรหัสผ่านสำเร็จ", variant: "success" });
    },
    onError: (error: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  // Forms
  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      role: "user",
      department: "",
      phone: "",
    },
  });

  const editForm = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  // Handlers
  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      department: user.department || "",
      phone: user.phone || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    resetPasswordForm.reset({ newPassword: "" });
    setResetPasswordDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleBadgeClass = (role: Role) => {
    const classes: Record<Role, string> = {
      admin: "bg-purple-100 text-purple-800",
      manager: "bg-indigo-100 text-indigo-800",
      staff: "bg-teal-100 text-teal-800",
      user: "bg-gray-100 text-gray-800",
      sales: "bg-blue-100 text-blue-800",
      salescoordinator: "bg-orange-100 text-orange-800",
      frontoffice: "bg-green-100 text-green-800",
      housekeeping: "bg-yellow-100 text-yellow-800",
    };
    return classes[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
          <p className="text-gray-500">จัดการข้อมูลผู้ใช้ในระบบ</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              createForm.reset();
              setCreateDialogOpen(true);
            }}
            className="bg-gradient-to-r from-blue-500 to-indigo-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่มผู้ใช้
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล, แผนก..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter || "all"}
              onValueChange={(v) => {
                setRoleFilter(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="ทุกตำแหน่ง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกตำแหน่ง</SelectItem>
                <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                <SelectItem value="manager">ผู้จัดการ</SelectItem>
                <SelectItem value="sales">ฝ่ายขาย</SelectItem>
                <SelectItem value="salescoordinator">Sales Coordinator</SelectItem>
                <SelectItem value="frontoffice">Front Office</SelectItem>
                <SelectItem value="housekeeping">Housekeeping</SelectItem>
                <SelectItem value="staff">พนักงาน</SelectItem>
                <SelectItem value="user">ผู้ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter || "all"}
              onValueChange={(v) => {
                setStatusFilter(v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="true">ใช้งาน</SelectItem>
                <SelectItem value="false">ระงับ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>ผู้ใช้</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>แผนก</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>เข้าสู่ระบบล่าสุด</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.data?.users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                                {getInitials(user.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.fullName}
                              </p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {user.department || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "success" : "secondary"}>
                            {user.isActive ? "ใช้งาน" : "ระงับ"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                          {user.lastLogin
                            ? format(new Date(user.lastLogin), "d MMM yyyy HH:mm", {
                                locale: th,
                              })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {isAdmin && user.id !== currentUser?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  แก้ไข
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResetPassword(user)}
                                >
                                  <Key className="h-4 w-4 mr-2" />
                                  รีเซ็ตรหัสผ่าน
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleActiveMutation.mutate(user.id)}
                                >
                                  {user.isActive ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      ระงับบัญชี
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      เปิดใช้งาน
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!data?.data?.users || data.data.users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          ไม่พบข้อมูลผู้ใช้
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data?.data?.pagination && data.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-500">
                    แสดง {(page - 1) * 10 + 1} -{" "}
                    {Math.min(page * 10, data.data.pagination.total)} จาก{" "}
                    {data.data.pagination.total} รายการ
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isFetching}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      หน้า {page} จาก {data.data.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(data.data.pagination.totalPages, p + 1)
                        )
                      }
                      disabled={
                        page === data.data.pagination.totalPages || isFetching
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลผู้ใช้ที่ต้องการเพิ่ม</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="create-email">อีเมล *</Label>
              <Input
                id="create-email"
                type="email"
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">รหัสผ่าน *</Label>
              <Input
                id="create-password"
                type="password"
                {...createForm.register("password")}
              />
              {createForm.formState.errors.password && (
                <p className="text-sm text-red-500">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-fullName">ชื่อ-นามสกุล *</Label>
              <Input id="create-fullName" {...createForm.register("fullName")} />
              {createForm.formState.errors.fullName && (
                <p className="text-sm text-red-500">
                  {createForm.formState.errors.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">ตำแหน่ง *</Label>
              <Select
                value={createForm.watch("role")}
                onValueChange={(v) => createForm.setValue("role", v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="sales">ฝ่ายขาย</SelectItem>
                  <SelectItem value="salescoordinator">Sales Coordinator</SelectItem>
                  <SelectItem value="frontoffice">Front Office</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                  <SelectItem value="user">ผู้ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-department">แผนก</Label>
              <Input
                id="create-department"
                {...createForm.register("department")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phone">เบอร์โทร</Label>
              <Input id="create-phone" {...createForm.register("phone")} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขผู้ใช้</DialogTitle>
            <DialogDescription>แก้ไขข้อมูลผู้ใช้ {selectedUser?.fullName}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) =>
              updateMutation.mutate({ id: selectedUser!.id, data })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-email">อีเมล *</Label>
              <Input id="edit-email" type="email" {...editForm.register("email")} />
              {editForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">ชื่อ-นามสกุล *</Label>
              <Input id="edit-fullName" {...editForm.register("fullName")} />
              {editForm.formState.errors.fullName && (
                <p className="text-sm text-red-500">
                  {editForm.formState.errors.fullName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">ตำแหน่ง *</Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(v) => editForm.setValue("role", v as Role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="manager">ผู้จัดการ</SelectItem>
                  <SelectItem value="sales">ฝ่ายขาย</SelectItem>
                  <SelectItem value="salescoordinator">Sales Coordinator</SelectItem>
                  <SelectItem value="frontoffice">Front Office</SelectItem>
                  <SelectItem value="housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="staff">พนักงาน</SelectItem>
                  <SelectItem value="user">ผู้ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">แผนก</Label>
              <Input id="edit-department" {...editForm.register("department")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">เบอร์โทร</Label>
              <Input id="edit-phone" {...editForm.register("phone")} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบผู้ใช้ "{selectedUser?.fullName}" ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedUser!.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
            <DialogDescription>
              ตั้งรหัสผ่านใหม่ให้ {selectedUser?.fullName}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={resetPasswordForm.handleSubmit((data) =>
              resetPasswordMutation.mutate({
                id: selectedUser!.id,
                password: data.newPassword,
              })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
              <Input
                id="new-password"
                type="password"
                {...resetPasswordForm.register("newPassword")}
              />
              {resetPasswordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">
                  {resetPasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                รีเซ็ต
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}