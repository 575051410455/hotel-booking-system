import { useState, useEffect } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  Loader2,
  Info,
  X
} from 'lucide-react';
import { useAuthStore } from '@/hooks/auth';

interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  baseRate: string;
  availableToday?: number;
}

interface Company {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface DailyAvailability {
  date: string;
  available: number;
  isBlocked: boolean;
}

interface ConflictingBooking {
  bookingId: string;
  customerName: string;
  checkIn: string;
  checkOut: string;
}

interface AvailabilityResult {
  roomType: string;
  roomTypeId: string;
  totalRooms: number;
  baseRate: string;
  availableRooms: number;
  requestedRooms: number;
  nights: number;
  hasAvailability: boolean;
  dailyAvailability: DailyAvailability[];
  blockedDates: string[];
  minStayViolation: { required: number; actual: number } | null;
  conflictingBookings: ConflictingBooking[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const Route = createFileRoute('/availability/')({
  component: CheckAvailabilityPage,
});

function CheckAvailabilityPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  // Data from API
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // Form state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState(1);
  const [companyId, setCompanyId] = useState('');

  // Result state
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const headers = getAuthHeaders();

        const [roomTypesRes, companiesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/availability/room-types`, { headers }),
          fetch(`${API_BASE_URL}/companies`, { headers }),
        ]);

        if (roomTypesRes.ok) {
          const data = await roomTypesRes.json();
          setRoomTypes(data.data || []);
        }

        if (companiesRes.ok) {
          const data = await companiesRes.json();
          setCompanies(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const checkAvailability = async () => {
    setErrors([]);
    setResult(null);

    // Client-side validation
    const newErrors: string[] = [];
    if (!checkIn) newErrors.push('กรุณาเลือกวันเช็คอิน');
    if (!checkOut) newErrors.push('กรุณาเลือกวันเช็คเอาท์');
    if (!roomTypeId) newErrors.push('กรุณาเลือกประเภทห้อง');
    if (!companyId) newErrors.push('กรุณาเลือกบริษัทลูกค้า');
    if (numberOfRooms < 1) newErrors.push('จำนวนห้องต้องมากกว่า 0');

    if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
      newErrors.push('วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน');
    }

    // Check if check-in is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn && new Date(checkIn) < today) {
      newErrors.push('วันเช็คอินต้องไม่เป็นวันที่ผ่านมาแล้ว');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/availability/detailed`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          checkIn,
          checkOut,
          roomTypeId,
          numberOfRooms,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
      }

      // Check for validation errors from backend
      const backendErrors: string[] = [];

      if (data.data.blockedDates && data.data.blockedDates.length > 0) {
        backendErrors.push(`มีวันที่ Blackout: ${data.data.blockedDates.join(', ')}`);
      }

      if (data.data.minStayViolation) {
        backendErrors.push(
          `ช่วงวันที่นี้ต้องจองขั้นต่ำ ${data.data.minStayViolation.required} คืน (คุณเลือก ${data.data.minStayViolation.actual} คืน)`
        );
      }

      if (backendErrors.length > 0) {
        setErrors(backendErrors);
      }

      setResult(data.data);
    } catch (error: any) {
      setErrors([error.message || 'เกิดข้อผิดพลาดในการตรวจสอบ']);
    } finally {
      setIsChecking(false);
    }
  };

  const handleProceedToBook = () => {
    const selectedRoomType = roomTypes.find(rt => rt.id === roomTypeId);
    const selectedCompany = companies.find(c => c.id === companyId);

    // Navigate to booking page with pre-filled data
    navigate({
      to: '/bookings/new',
      search: {
        checkIn,
        checkOut,
        roomType: selectedRoomType?.name,
        numberOfRooms,
        company: selectedCompany?.name,
        companyId,
        rate: selectedRoomType?.baseRate,
      },
    });
  };

  const getSelectedRoomType = () => roomTypes.find(rt => rt.id === roomTypeId);

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

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-indigo-900">เช็คห้องพักว่าง</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันเช็คอิน <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วันเช็คเอาท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={checkIn || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทห้อง <span className="text-red-500">*</span>
              </label>
              <select
                value={roomTypeId}
                onChange={(e) => setRoomTypeId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- เลือกประเภทห้อง --</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name} 
                    {/* ({rt.totalRooms} ห้อง) - ฿{parseFloat(rt.baseRate).toLocaleString()}/คืน */}
                  </option>
                ))}
              </select>
              {roomTypeId && getSelectedRoomType()?.availableToday !== undefined && (
                <p className="mt-1 text-sm text-gray-500">
                  ห้องว่างวันนี้: {getSelectedRoomType()?.availableToday} ห้อง
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนห้อง <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={numberOfRooms}
                onChange={(e) => setNumberOfRooms(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                บริษัทลูกค้า <span className="text-red-500">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">-- เลือกบริษัทลูกค้า --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Estimate */}
          {checkIn && checkOut && roomTypeId && numberOfRooms > 0 && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-indigo-900">ประมาณการราคา</span>
              </div>
              {(() => {
                const nights = Math.ceil(
                  (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
                );
                const rate = parseFloat(getSelectedRoomType()?.baseRate || '0');
                const total = rate * numberOfRooms * nights;
                return (
                  <p className="text-sm text-indigo-700">
                    {numberOfRooms} ห้อง × {nights} คืน × ฿{rate.toLocaleString()} = {' '}
                    <span className="font-semibold">฿{total.toLocaleString()}</span>
                  </p>
                );
              })()}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 mb-2">พบข้อผิดพลาด:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => setErrors([])}>
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={checkAvailability}
            disabled={isChecking}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            ตรวจสอบห้องว่าง
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">ผลการตรวจสอบ</h2>

            {result.hasAvailability ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-lg font-semibold text-green-900">มีห้องว่างเพียงพอ!</p>
                    <p className="text-green-700 mt-2">
                      {result.roomType}: มีห้องว่างอย่างน้อย <strong>{result.availableRooms}</strong> ห้อง 
                      (ต้องการ {result.requestedRooms} ห้อง)
                    </p>
                    <p className="text-green-700">
                      ระยะเวลา: {result.nights} คืน | ราคาต่อห้อง: ฿{parseFloat(result.baseRate).toLocaleString()}/คืน
                    </p>
                  </div>
                </div>

                {/* Daily Availability */}
                <div className="mt-6">
                  <p className="font-medium text-gray-700 mb-3">ห้องว่างรายวัน:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {result.dailyAvailability.map((day) => (
                      <div
                        key={day.date}
                        className={`border rounded-lg p-3 text-center ${
                          day.isBlocked
                            ? 'bg-red-100 border-red-300'
                            : day.available >= numberOfRooms
                            ? 'bg-white border-green-200'
                            : 'bg-yellow-100 border-yellow-300'
                        }`}
                      >
                        <p className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                        </p>
                        <p className={`text-sm font-semibold ${
                          day.isBlocked ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {day.isBlocked ? 'Blocked' : `${day.available} ว่าง`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceedToBook}
                  className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  ดำเนินการจองห้องพัก
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-lg font-semibold text-red-900">ห้องไม่เพียงพอ</p>
                    <p className="text-red-700 mt-2">
                      {result.roomType}: มีห้องว่างเพียง <strong>{result.availableRooms}</strong> ห้อง 
                      (ต้องการ {result.requestedRooms} ห้อง)
                    </p>
                  </div>
                </div>

                {/* Conflicting Bookings */}
                {result.conflictingBookings.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium text-red-800 mb-2">การจองที่ขัดแย้ง:</p>
                    <div className="space-y-2">
                      {result.conflictingBookings.map((booking, index) => (
                        <div key={index} className="bg-white border border-red-200 rounded p-3 text-sm">
                          <p className="font-medium text-gray-900">{booking.bookingId}</p>
                          <p className="text-gray-600">
                            {booking.customerName} | {booking.checkIn} → {booking.checkOut}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Availability */}
                <div className="mt-6">
                  <p className="font-medium text-gray-700 mb-3">ห้องว่างรายวัน:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {result.dailyAvailability.map((day) => (
                      <div
                        key={day.date}
                        className={`border rounded-lg p-3 text-center ${
                          day.isBlocked
                            ? 'bg-red-100 border-red-300'
                            : day.available < numberOfRooms
                            ? 'bg-red-100 border-red-300'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <p className="text-xs text-gray-500">
                          {new Date(day.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                        </p>
                        <p className={`text-sm font-semibold ${
                          day.isBlocked || day.available < numberOfRooms ? 'text-red-700' : 'text-gray-700'
                        }`}>
                          {day.isBlocked ? 'Blocked' : `${day.available} ว่าง`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestions */}
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-medium text-yellow-900 mb-2">💡 คำแนะนำ:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                    <li>ลองเลือกประเภทห้องอื่น</li>
                    <li>เลือกวันที่อื่น</li>
                    <li>ลดจำนวนห้อง</li>
                    <li>ติดต่อ Sales Coordinator เพื่อขอความช่วยเหลือ</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}