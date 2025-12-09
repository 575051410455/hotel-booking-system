import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  Save,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';



interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  company: string;
  saleOwner: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfRooms: number;
  rate: string | number;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VOID';
  createdAt: string;
  holdExpiry?: string;
  documents?: string[];
  cancelReason?: string;
  cancelDocuments?: string[];
  cancelledAt?: string;
  cancelledBy?: string;
  lastAmendedAt?: string;
  lastAmendedBy?: string;
  amendmentLogs?: {
    timestamp: string;
    amendedBy: string;
    changes: {
      field: string;
      before: any;
      after: any;
    }[];
  }[];
  notes?: string;
}

interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  baseRate: string;
}

interface SalesOwner {
  id: string;
  name: string;
  email: string;
}

type SortField = 'bookingId' | 'customerName' | 'checkIn' | 'checkOut' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const paymentMethods = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เครดิต 30 วัน',
  'เครดิต 45 วัน',
  'เครดิต 60 วัน',
];


export const Route = createFileRoute('/bookings/')({
  component: BookingTable,
})



function BookingTable() {
  // Data from API
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [salesOwners, setSalesOwners] = useState<SalesOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Edit/Add state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Sort and pagination
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // Fetch bookings from API
  const fetchBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(itemsPerPage));
      
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roomTypeFilter !== 'all') params.set('roomType', roomTypeFilter);
      if (dateFrom) params.set('checkInFrom', dateFrom);
      if (dateTo) params.set('checkInTo', dateTo);

      const response = await fetch(`${API_BASE_URL}/bookings?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch bookings');
      }

      setBookings(result.data || []);
      setTotalItems(result.pagination?.total || result.data?.length || 0);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reference data (room types, sales owners)
  const fetchReferenceData = async () => {
    try {
      const [roomTypesRes, salesOwnersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/room-types`),
        fetch(`${API_BASE_URL}/sales-owners`),
      ]);

      if (roomTypesRes.ok) {
        const data = await roomTypesRes.json();
        setRoomTypes(data.data || []);
      }

      if (salesOwnersRes.ok) {
        const data = await salesOwnersRes.json();
        setSalesOwners(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchReferenceData();
  }, []);

  // Fetch bookings when filters change
  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, roomTypeFilter, dateFrom, dateTo]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchBookings();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Client-side sorting (since we already have the data)
  const sortedBookings = useMemo(() => {
    const sorted = [...bookings];
    sorted.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'checkIn' || sortField === 'checkOut' || sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [bookings, sortField, sortDirection]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      ...booking,
      rate: typeof booking.rate === 'string' ? parseFloat(booking.rate) : booking.rate,
    });
    setFormErrors([]);
  };

  const handleDelete = async (bookingId: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบการจอง ${bookingId}?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found');

      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete booking');
      }

      await fetchBookings();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    const reason = prompt('กรุณาระบุเหตุผลในการยกเลิก:');
    if (!reason) return;

    setIsSubmitting(true);
    try {
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found');

      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason,
          cancelledBy: 'Admin', // Replace with actual user
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cancel booking');
      }

      await fetchBookings();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    setIsSubmitting(true);
    try {
      const booking = bookings.find(b => b.bookingId === bookingId);
      if (!booking) throw new Error('Booking not found');

      const response = await fetch(`${API_BASE_URL}/bookings/${booking.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to confirm booking');
      }

      await fetchBookings();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการยืนยันการจอง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.customerName?.trim()) errors.push('กรุณากรอกชื่อ/บริษัท');
    if (!formData.saleOwner) errors.push('กรุณาเลือก Sale Owner');
    if (!formData.phone?.trim()) errors.push('กรุณากรอกเบอร์ติดต่อ');
    if (!formData.email?.trim()) errors.push('กรุณากรอกอีเมล');
    if (!formData.checkIn) errors.push('กรุณาเลือกวันเช็คอิน');
    if (!formData.checkOut) errors.push('กรุณาเลือกวันเช็คเอาท์');
    if (!formData.roomType) errors.push('กรุณาเลือกประเภทห้อง');
    if (!formData.numberOfRooms || formData.numberOfRooms < 1) errors.push('จำนวนห้องต้องมากกว่า 0');
    if (formData.rate === undefined || Number(formData.rate) < 0) errors.push('ราคาต้องมากกว่าหรือเท่ากับ 0');
    if (!formData.paymentMethod) errors.push('กรุณาเลือกวิธีชำระเงิน');

    if (formData.checkIn && formData.checkOut && new Date(formData.checkIn) >= new Date(formData.checkOut)) {
      errors.push('วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (isAddingNew) {
        // Create new booking
        const payload = {
          customerName: formData.customerName,
          company: formData.company || formData.customerName,
          saleOwner: formData.saleOwner,
          phone: formData.phone,
          email: formData.email,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          roomType: formData.roomType,
          numberOfRooms: formData.numberOfRooms,
          rate: Number(formData.rate),
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
        };

        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to create booking');
        }

        setIsAddingNew(false);
      } else if (editingBooking) {
        // Update existing booking
        const payload = {
          customerName: formData.customerName,
          company: formData.company || formData.customerName,
          saleOwner: formData.saleOwner,
          phone: formData.phone,
          email: formData.email,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          roomType: formData.roomType,
          numberOfRooms: formData.numberOfRooms,
          rate: Number(formData.rate),
          paymentMethod: formData.paymentMethod,
          status: formData.status,
          notes: formData.notes,
        };

        const response = await fetch(`${API_BASE_URL}/bookings/${editingBooking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to update booking');
        }

        setEditingBooking(null);
      }

      setFormData({});
      setFormErrors([]);
      await fetchBookings();
    } catch (err: any) {
      setFormErrors([err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setEditingBooking(null);
    setIsAddingNew(false);
    setFormData({});
    setFormErrors([]);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setFormData({
      status: 'PENDING',
      numberOfRooms: 1,
      rate: 2500,
    });
    setFormErrors([]);
  };

  const exportToCSV = () => {
    const headers = [
      'Booking ID',
      'Customer',
      'Company',
      'Sale Owner',
      'Phone',
      'Email',
      'Check-in',
      'Check-out',
      'Room Type',
      'Rooms',
      'Rate',
      'Payment Method',
      'Status',
      'Created At',
      'Notes'
    ];

    const rows = bookings.map(b => [
      b.bookingId,
      b.customerName,
      b.company,
      b.saleOwner,
      b.phone,
      b.email,
      b.checkIn,
      b.checkOut,
      b.roomType,
      b.numberOfRooms,
      b.rate,
      b.paymentMethod,
      b.status,
      b.createdAt,
      b.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      CONFIRMED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      CANCELLED: 'bg-red-100 text-red-800',
      VOID: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `฿${num.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปหน้าหลัก
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ตารางการจองทั้งหมด</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchBookings()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </button>
              <button
                onClick={exportToCSV}
                disabled={bookings.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่มการจองใหม่
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Booking ID, ชื่อลูกค้า..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="VOID">Void</option>
              </select>
            </div>

            <div>
              <select
                value={roomTypeFilter}
                onChange={(e) => {
                  setRoomTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">ทุกประเภทห้อง</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.name}>{rt.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="จากวันที่"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ถึงวันที่"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="ml-3 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th 
                        className="text-left p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSort('bookingId')}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          Booking ID
                          {sortField === 'bookingId' && (
                            <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSort('customerName')}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          ลูกค้า
                          {sortField === 'customerName' && (
                            <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">เบอร์ติดต่อ</th>
                      <th 
                        className="text-left p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSort('checkIn')}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          Check-in
                          {sortField === 'checkIn' && (
                            <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSort('checkOut')}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          Check-out
                          {sortField === 'checkOut' && (
                            <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">ประเภทห้อง</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">จำนวน</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">ราคา</th>
                      <th 
                        className="text-left p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                          สถานะ
                          {sortField === 'status' && (
                            <span className="text-indigo-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span className="font-mono text-sm text-indigo-600">{booking.bookingId}</span>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-gray-900">{booking.customerName}</p>
                            <p className="text-sm text-gray-500">{booking.saleOwner}</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-700">{booking.phone}</td>
                        <td className="p-3 text-sm text-gray-700">{formatDate(booking.checkIn)}</td>
                        <td className="p-3 text-sm text-gray-700">{formatDate(booking.checkOut)}</td>
                        <td className="p-3 text-sm text-gray-700">{booking.roomType}</td>
                        <td className="p-3 text-sm text-gray-700">{booking.numberOfRooms} ห้อง</td>
                        <td className="p-3 text-sm text-gray-700">{formatCurrency(booking.rate)}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {booking.status === 'PENDING' && (
                              <button
                                onClick={() => handleConfirm(booking.bookingId)}
                                disabled={isSubmitting}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="ยืนยัน"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                              <button
                                onClick={() => handleCancel(booking.bookingId)}
                                disabled={isSubmitting}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                title="ยกเลิก"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(booking)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(booking.bookingId)}
                              disabled={isSubmitting}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bookings.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  ไม่พบข้อมูลการจอง
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600">
                    แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-700">
                      หน้า {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {(editingBooking || isAddingNew) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {isAddingNew ? 'เพิ่มการจองใหม่' : `แก้ไขการจอง ${editingBooking?.bookingId}`}
              </h2>
              <button
                onClick={handleModalClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Form Errors */}
              {formErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 mb-2">พบข้อผิดพลาด:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {formErrors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ชื่อ/บริษัท <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customerName || ''}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sale Owner <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.saleOwner || ''}
                    onChange={(e) => setFormData({ ...formData, saleOwner: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- เลือก --</option>
                    {salesOwners.map((owner) => (
                      <option key={owner.id} value={owner.name}>{owner.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เบอร์ติดต่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-in <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkIn || ''}
                    onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check-out <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkOut || ''}
                    onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ประเภทห้อง <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.roomType || ''}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- เลือก --</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.name}>{rt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    จำนวนห้อง <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.numberOfRooms || 1}
                    onChange={(e) => setFormData({ ...formData, numberOfRooms: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate (บาท/ห้อง/คืน) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rate || 0}
                    onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    วิธีชำระเงิน <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMethod || ''}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">-- เลือก --</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>

                {!isAddingNew && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      สถานะ <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status || 'PENDING'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="VOID">Void</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">บริษัท</label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder={formData.customerName || 'ชื่อบริษัท'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">หมายเหตุ</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-6 border-t">
                <button
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}