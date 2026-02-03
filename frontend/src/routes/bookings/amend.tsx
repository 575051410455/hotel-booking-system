import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Edit, 
  AlertCircle, 
  Check, 
  FileText, 
  Clock, 
  User as UserIcon,
  Loader2,
  X
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  roomTypesQueryOptions,
  salesUsersQueryOptions,
  api,
  authHeaders,
  getAuthToken,
  type Booking,
} from '@/lib/api';
import { useAuthStore } from '@/hooks/auth';


// Amendment log type
interface AmendLog {
  field: string;
  before: any;
  after: any;
}

const paymentMethods = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เครดิต 30 วัน',
  'เครดิต 45 วัน',
  'เครดิต 60 วัน',
];

export const Route = createFileRoute('/bookings/amend')({
  component: AmendBooking,
})



function AmendBooking() {
  // Auth - ต้องอยู่บนสุดก่อน hooks อื่นๆ
  const { user: currentUser, accessToken } = useAuthStore();

  // Data from API using TanStack Query
  const { data: roomTypesRes, isLoading: isLoadingRoomTypes } = useQuery(roomTypesQueryOptions());
  const { data: salesOwnersRes, isLoading: isLoadingSalesOwners } = useQuery(salesUsersQueryOptions());

  const roomTypes = roomTypesRes?.data || [];
  const salesOwners = salesOwnersRes?.data || [];
  const isLoadingData = isLoadingRoomTypes || isLoadingSalesOwners;

  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected booking state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [amendments, setAmendments] = useState<Partial<Booking>>({});
  const [amendNotes, setAmendNotes] = useState('');
  const [amendLogs, setAmendLogs] = useState<AmendLog[]>([]);

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search
  useEffect(() => {
    // Skip if no user or no search keyword
    if (!currentUser) return;
    
    const timer = setTimeout(() => {
      if (searchKeyword.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchKeyword, currentUser]);

  // ============ CONDITIONAL RETURNS AFTER ALL HOOKS ============

  // --- เช็ค: ถ้าไม่มี User (ยังไม่ได้ Login) ให้แสดง Loading ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600 mb-2" />
          <p>กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission
  if (currentUser.role !== 'salescoordinator' && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            to='/dashboard'
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            กลับไปหน้าหลัก
          </Link>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
              <p className="text-gray-600">
                เฉพาะ Sales Coordinator เท่านั้นที่สามารถแก้ไขการจองได้
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  // ============ HELPER FUNCTIONS ============

  // Search bookings from API
  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const token = getAuthToken();
      const res = await api.bookings.$get(
        { query: { search: searchKeyword, limit: 20 } },
        { headers: authHeaders(token) }
      );
      const response = await res.json();

      if (response.success && response.data) {
        setSearchResults(response.data);
      } else {
        setError(response.error || 'เกิดข้อผิดพลาดในการค้นหา');
        setSearchResults([]);
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectBooking = async (booking: Booking) => {
    // Fetch fresh booking data
    try {
      const token = getAuthToken();
      const res = await api.bookings[':id'].$get(
        { param: { id: booking.id } },
        { headers: authHeaders(token) }
      );
      const response = await res.json();
      if (response.success && response.data) {
        setSelectedBooking(response.data);
      } else {
        setSelectedBooking(booking);
      }
    } catch {
      setSelectedBooking(booking);
    }

    setAmendments({});
    setAmendLogs([]);
    setAmendNotes('');
    setError('');
    setSearchResults([]);
    setSearchKeyword('');
  };

  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      customerName: 'ชื่อลูกค้า',
      phone: 'เบอร์ติดต่อ',
      email: 'อีเมล',
      checkIn: 'วันเข้าพัก',
      checkOut: 'วันออก',
      roomType: 'ประเภทห้อง',
      numberOfRooms: 'จำนวนห้อง',
      rate: 'อัตราค่าห้อง',
      company: 'บริษัท',
      saleOwner: 'Sale Owner',
      paymentMethod: 'วิธีชำระเงิน',
    };
    return labels[field] || field;
  };

  const handleFieldChange = (field: keyof Booking, value: any) => {
    if (!selectedBooking) return;

    // Get the original value
    const originalValue = selectedBooking[field];
    
    // Track the change
    if (originalValue !== value) {
      const existingLogIndex = amendLogs.findIndex(log => log.field === getFieldLabel(field));
      const newLog: AmendLog = {
        field: getFieldLabel(field),
        before: originalValue,
        after: value,
      };

      if (existingLogIndex >= 0) {
        // Update existing log
        const updatedLogs = [...amendLogs];
        // If value is back to original, remove the log
        if (value === originalValue) {
          updatedLogs.splice(existingLogIndex, 1);
        } else {
          updatedLogs[existingLogIndex] = newLog;
        }
        setAmendLogs(updatedLogs);
      } else {
        // Add new log
        setAmendLogs([...amendLogs, newLog]);
      }
    } else {
      // Value is back to original, remove from logs
      setAmendLogs(amendLogs.filter(log => log.field !== getFieldLabel(field)));
    }

    setAmendments({
      ...amendments,
      [field]: value,
    });
  };

  const canEditField = (field: string): boolean => {
    if (!selectedBooking) return false;

    // Cannot edit cancelled bookings
    if (selectedBooking.status === 'CANCELLED' || selectedBooking.status === 'VOID') {
      return false;
    }

    // PENDING: can edit all fields
    if (selectedBooking.status === 'PENDING') {
      return true;
    }

    // CONFIRMED: limited edits
    if (selectedBooking.status === 'CONFIRMED') {
      const limitedFields = ['customerName', 'phone', 'email', 'company', 'checkIn', 'checkOut', 'roomType', 'numberOfRooms'];
      return limitedFields.includes(field);
    }

    return false;
  };

  const getCurrentValue = (field: keyof Booking) => {
    if (amendments[field] !== undefined) {
      return amendments[field];
    }
    return selectedBooking?.[field];
  };

  const handleSubmitAmend = async () => {
    if (!selectedBooking) return;

    if (amendLogs.length === 0) {
      setError('ไม่มีการเปลี่ยนแปลงข้อมูล');
      return;
    }

    if (!amendNotes.trim()) {
      setError('กรุณาระบุหมายเหตุหรือเหตุผลในการแก้ไข');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Build the changes object for the API
      const changes: Record<string, any> = {};
      
      if (amendments.customerName !== undefined) changes.customerName = amendments.customerName;
      if (amendments.company !== undefined) changes.company = amendments.company;
      if (amendments.phone !== undefined) changes.phone = amendments.phone;
      if (amendments.email !== undefined) changes.email = amendments.email;
      if (amendments.checkIn !== undefined) changes.checkIn = amendments.checkIn;
      if (amendments.checkOut !== undefined) changes.checkOut = amendments.checkOut;
      if (amendments.roomType !== undefined) changes.roomType = amendments.roomType;
      if (amendments.numberOfRooms !== undefined) changes.numberOfRooms = amendments.numberOfRooms;
      if (amendments.rate !== undefined) changes.rate = Number(amendments.rate);
      if (amendments.saleOwner !== undefined) changes.saleOwner = amendments.saleOwner;
      if (amendments.paymentMethod !== undefined) changes.paymentMethod = amendments.paymentMethod;

      // Call the amend API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/bookings/${selectedBooking.id}/amend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amendedBy: currentUser.fullName,
          changes,
          notes: amendNotes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการแก้ไข');
      }

      // Success
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedBooking(null);
        setAmendments({});
        setAmendLogs([]);
        setAmendNotes('');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBooking(null);
    setAmendments({});
    setAmendLogs([]);
    setAmendNotes('');
    setError('');
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

  // ============ MAIN RENDER ============

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link
            to='/dashboard'
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปหน้าหลัก
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Edit className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Amend การจอง</h1>
              <p className="text-gray-600">แก้ไขข้อมูลการจองที่มีอยู่แล้ว (เฉพาะ Sales Coordinator)</p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-5 h-5" />
                <p className="font-medium">แก้ไขการจองสำเร็จ!</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
                <button onClick={() => setError('')} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Search Section */}
          {!selectedBooking && (
            <div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหาการจอง</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Booking ID, ชื่อลูกค้า, เบอร์โทร, อีเมล..."
                      className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearching && <Loader2 className="w-4 h-4 animate-spin" />}
                    ค้นหา
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  <span className="ml-2 text-gray-600">กำลังค้นหา...</span>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">พบ {searchResults.length} รายการ</p>
                  {searchResults.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => handleSelectBooking(booking)}
                      className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{booking.bookingId}</p>
                          <p className="text-gray-600">{booking.customerName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{booking.checkIn}</span>
                        <span>→</span>
                        <span>{booking.checkOut}</span>
                        <span className="ml-auto">{booking.roomType} - {booking.numberOfRooms} ห้อง</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && searchKeyword && searchResults.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  ไม่พบการจองที่ตรงกับคำค้นหา
                </div>
              )}
            </div>
          )}

          {/* Amend Form */}
          {selectedBooking && (
            <div>
              {/* Current Booking Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-blue-900">
                      {selectedBooking.bookingId} - {selectedBooking.customerName}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedBooking.checkIn} → {selectedBooking.checkOut}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedBooking.status)}`}>
                    {selectedBooking.status}
                  </span>
                </div>
                {selectedBooking.status === 'CONFIRMED' && (
                  <p className="text-xs text-blue-700 mt-2">
                    ⓘ การจองที่ยืนยันแล้วสามารถแก้ไขได้เฉพาะบางข้อมูล
                  </p>
                )}
                {(selectedBooking.status === 'CANCELLED' || selectedBooking.status === 'VOID') && (
                  <p className="text-xs text-red-700 mt-2">
                    ⓘ ไม่สามารถแก้ไขการจองที่ถูกยกเลิกได้
                  </p>
                )}
              </div>

              {/* Amendment History */}
              {selectedBooking.amendmentLogs && selectedBooking.amendmentLogs.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    ประวัติการแก้ไข
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedBooking.amendmentLogs.map((log, index) => (
                      <div key={index} className="text-sm border-l-2 border-orange-300 pl-3">
                        <p className="text-gray-700 flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span className="font-medium">{log.amendedBy}</span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-500">{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                        </p>
                        <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                          {log.changes.map((change, i) => (
                            <li key={i}>
                              • {change.field}: <span className="line-through text-red-500">{String(change.before)}</span> → <span className="text-green-600 font-medium">{String(change.after)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit Form */}
              {selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'VOID' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อลูกค้า</label>
                      <input
                        type="text"
                        value={String(getCurrentValue('customerName') || '')}
                        onChange={(e) => handleFieldChange('customerName', e.target.value)}
                        disabled={!canEditField('customerName')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">บริษัท</label>
                      <input
                        type="text"
                        value={String(getCurrentValue('company') || '')}
                        onChange={(e) => handleFieldChange('company', e.target.value)}
                        disabled={!canEditField('company')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">เบอร์ติดต่อ</label>
                      <input
                        type="tel"
                        value={String(getCurrentValue('phone') || '')}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        disabled={!canEditField('phone')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
                      <input
                        type="email"
                        value={String(getCurrentValue('email') || '')}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        disabled={!canEditField('email')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Check-in */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">วันเข้าพัก</label>
                      <input
                        type="date"
                        value={String(getCurrentValue('checkIn') || '')}
                        onChange={(e) => handleFieldChange('checkIn', e.target.value)}
                        disabled={!canEditField('checkIn')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Check-out */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">วันออก</label>
                      <input
                        type="date"
                        value={String(getCurrentValue('checkOut') || '')}
                        onChange={(e) => handleFieldChange('checkOut', e.target.value)}
                        disabled={!canEditField('checkOut')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Room Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทห้อง</label>
                      <select
                        value={String(getCurrentValue('roomType') || '')}
                        onChange={(e) => handleFieldChange('roomType', e.target.value)}
                        disabled={!canEditField('roomType')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- เลือกประเภทห้อง --</option>
                        {roomTypes.map((rt) => (
                          <option key={rt.id} value={rt.name}>{rt.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Number of Rooms */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนห้อง</label>
                      <input
                        type="number"
                        min="1"
                        value={Number(getCurrentValue('numberOfRooms')) || 1}
                        onChange={(e) => handleFieldChange('numberOfRooms', parseInt(e.target.value) || 1)}
                        disabled={!canEditField('numberOfRooms')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">อัตราค่าห้อง (บาท/ห้อง/คืน)</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={Number(getCurrentValue('rate')) || 0}
                        onChange={(e) => handleFieldChange('rate', parseFloat(e.target.value) || 0)}
                        disabled={!canEditField('rate')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Sale Owner */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sale Owner</label>
                      <select
                        value={String(getCurrentValue('saleOwner') || '')}
                        onChange={(e) => handleFieldChange('saleOwner', e.target.value)}
                        disabled={!canEditField('saleOwner')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- เลือก Sale Owner --</option>
                        {salesOwners.map((owner) => (
                          <option key={owner.id} value={owner.name}>{owner.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">วิธีชำระเงิน</label>
                      <select
                        value={String(getCurrentValue('paymentMethod') || '')}
                        onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                        disabled={!canEditField('paymentMethod')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- เลือกวิธีชำระเงิน --</option>
                        {paymentMethods.map((method) => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Amendment Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      หมายเหตุ / เหตุผลในการแก้ไข <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={amendNotes}
                      onChange={(e) => setAmendNotes(e.target.value)}
                      placeholder="กรุณาระบุเหตุผลหรือรายละเอียดการแก้ไข..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {/* Changes Summary */}
                  {amendLogs.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">การเปลี่ยนแปลงที่จะบันทึก:</h3>
                      <ul className="text-yellow-800 space-y-1">
                        {amendLogs.map((log, index) => (
                          <li key={index} className="text-sm">
                            • {log.field}: <span className="line-through text-red-600">{String(log.before)}</span> → <span className="font-semibold text-green-700">{String(log.after)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-6 border-t">
                    <button
                      onClick={resetForm}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleSubmitAmend}
                      disabled={amendLogs.length === 0 || !amendNotes.trim() || isSubmitting}
                      className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}