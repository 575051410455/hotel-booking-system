import { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search,
  Loader2,
  RefreshCw,
  X
} from 'lucide-react';
import { useAuthStore } from '@/hooks/auth';

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
  rate: number | string;
  paymentMethod: string;
  status: string;
  holdExpiry?: string;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const Route = createFileRoute('/bookings/confirm')({
  component: ConfirmRoomPage,
});

function ConfirmRoomPage() {
  const { accessToken } = useAuthStore();

  // State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Helper function to get auth headers
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
  };

  // Fetch pending bookings
  const fetchPendingBookings = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings?status=PENDING&limit=100`,
        { headers: getAuthHeaders() }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }

      setBookings(data.data || []);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
  }, [accessToken]);

  // Filter bookings by search query
  const filteredBookings = bookings.filter(booking =>
    booking.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.phone.includes(searchQuery) ||
    booking.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if booking is expired
  const isExpired = (holdExpiry?: string) => {
    if (!holdExpiry) return false;
    return new Date(holdExpiry) < new Date();
  };

  // Confirm booking
  const handleConfirm = async (booking: Booking) => {
    if (isExpired(booking.holdExpiry)) {
      setError('การจองนี้หมดอายุแล้ว ไม่สามารถยืนยันได้');
      return;
    }

    setIsConfirming(booking.id);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${booking.id}/confirm`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'เกิดข้อผิดพลาดในการยืนยัน');
      }

      // Update the booking with confirmed status
      setSelectedBooking({
        ...booking,
        status: 'CONFIRMED',
      });
      setSuccess(true);

      // Remove from pending list
      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการยืนยัน');
    } finally {
      setIsConfirming(null);
    }
  };

  // Reset to list view
  const handleBackToList = () => {
    setSuccess(false);
    setSelectedBooking(null);
    fetchPendingBookings();
  };

  // Success view
  if (success && selectedBooking) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-900 mb-2">ยืนยันการจองสำเร็จ!</h1>
              <p className="text-gray-600">การจอง {selectedBooking.bookingId} ได้รับการยืนยันแล้ว</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">รายละเอียดการจอง</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium text-gray-900">{selectedBooking.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ลูกค้า:</span>
                  <span className="text-gray-900">{selectedBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">บริษัท:</span>
                  <span className="text-gray-900">{selectedBooking.company || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="text-gray-900">{selectedBooking.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="text-gray-900">{selectedBooking.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ประเภทห้อง:</span>
                  <span className="text-gray-900">{selectedBooking.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">จำนวนห้อง:</span>
                  <span className="text-gray-900">{selectedBooking.numberOfRooms} ห้อง</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ราคา:</span>
                  <span className="text-gray-900">
                    ฿{typeof selectedBooking.rate === 'number' 
                      ? selectedBooking.rate.toLocaleString() 
                      : parseFloat(selectedBooking.rate).toLocaleString()
                    }/คืน
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">สถานะ:</span>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    CONFIRMED
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="font-medium text-blue-900 mb-2">✓ การดำเนินการที่เกิดขึ้น:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>ห้องถูก Block แบบถาวร</li>
                <li>ระบบได้ส่งอีเมลยืนยันไปยังลูกค้า</li>
                <li>แจ้งเตือนไปยัง Front Office และ Housekeeping</li>
                <li>บันทึกข้อมูลเข้าสู่ระบบ PMS</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBackToList}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                ยืนยันการจองอื่น
              </button>
              <Link
                to="/dashboard"
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                กลับไปหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading view
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปหน้าหลัก
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">คอนเฟิร์มห้องพัก</h1>
            </div>
            <button
              onClick={fetchPendingBookings}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
                <button onClick={() => setError('')} className="ml-auto">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ค้นหาการจอง
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วย Booking ID, ชื่อลูกค้า, เบอร์โทร, หรืออีเมล"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Pending Count */}
          <div className="mb-4 text-sm text-gray-600">
            พบ {filteredBookings.length} รายการที่รอยืนยัน
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchQuery ? 'ไม่พบการจองที่ตรงกับคำค้นหา' : 'ไม่พบการจองที่รอยืนยัน'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const expired = isExpired(booking.holdExpiry);
                const isProcessing = isConfirming === booking.id;

                return (
                  <div
                    key={booking.id}
                    className={`border rounded-lg p-6 ${
                      expired ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    } transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{booking.bookingId}</h3>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            {booking.status}
                          </span>
                          {expired && (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              หมดอายุ
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{booking.customerName}</p>
                        {booking.company && (
                          <p className="text-sm text-gray-500">{booking.company}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleConfirm(booking)}
                        disabled={expired || isProcessing}
                        className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          expired
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } disabled:opacity-50`}
                      >
                        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                        ยืนยันการจอง
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Check-in</p>
                        <p className="font-medium text-gray-900">{booking.checkIn}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Check-out</p>
                        <p className="font-medium text-gray-900">{booking.checkOut}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ประเภทห้อง</p>
                        <p className="font-medium text-gray-900">{booking.roomType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">จำนวนห้อง</p>
                        <p className="font-medium text-gray-900">{booking.numberOfRooms} ห้อง</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Sale Owner</p>
                        <p className="font-medium text-gray-900">{booking.saleOwner}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">เบอร์ติดต่อ</p>
                        <p className="font-medium text-gray-900">{booking.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Rate</p>
                        <p className="font-medium text-gray-900">
                          ฿{typeof booking.rate === 'number' 
                            ? booking.rate.toLocaleString() 
                            : parseFloat(booking.rate).toLocaleString()
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">วิธีชำระเงิน</p>
                        <p className="font-medium text-gray-900">{booking.paymentMethod}</p>
                      </div>
                    </div>

                    {booking.holdExpiry && (
                      <div className={`flex items-center gap-2 text-sm ${expired ? 'text-red-700' : 'text-gray-600'}`}>
                        <Clock className="w-4 h-4" />
                        <p>
                          หมดอายุ Hold: {new Date(booking.holdExpiry).toLocaleString('th-TH')}
                        </p>
                      </div>
                    )}

                    {expired && (
                      <div className="mt-4 bg-red-100 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          ⚠️ การจองนี้หมดอายุแล้ว กรุณาติดต่อลูกค้าเพื่อสร้างการจองใหม่ หรือยกเลิกการจองนี้
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}