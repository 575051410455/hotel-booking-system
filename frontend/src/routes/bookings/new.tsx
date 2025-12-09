import { useState, useEffect } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Hotel, Loader2 } from 'lucide-react';



interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  baseRate: string;
}

interface Company {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
}

interface SalesOwner {
  id: string;
  name: string;
  email: string;
}

interface BookingPayload {
  customerName: string;
  company: string;
  saleOwner: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfRooms: number;
  rate: number;
  paymentMethod: string;
  documents?: string[];
  notes?: string;
}

interface BookingSummary extends BookingPayload {
  id: string;
  bookingId: string;
  status: string;
  createdAt: string;
  holdExpiry: string;
  nights: number;
  total: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const paymentMethods = [
  'เงินสด',
  'โอนเงิน',
  'บัตรเครดิต',
  'เครดิต 30 วัน',
  'เครดิต 45 วัน',
  'เครดิต 60 วัน',
];


export const Route = createFileRoute('/bookings/new')({
  component: BookRoomPage,
})

function BookRoomPage() {
  // Data from API
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [salesOwners, setSalesOwners] = useState<SalesOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [saleOwner, setSaleOwner] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Booking Details
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState(1);
  const [rate, setRate] = useState(2500);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  // Documents
  const [hasDocuments, setHasDocuments] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // State
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<BookingSummary | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [roomTypesRes, companiesRes, salesOwnersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/room-types`),
          fetch(`${API_BASE_URL}/companies`),
          fetch(`${API_BASE_URL}/sales-owners`),
        ]);

        if (roomTypesRes.ok) {
          const roomTypesData = await roomTypesRes.json();
          setRoomTypes(roomTypesData.data || []);
        }

        if (companiesRes.ok) {
          const companiesData = await companiesRes.json();
          setCompanies(companiesData.data || []);
        }

        if (salesOwnersRes.ok) {
          const salesOwnersData = await salesOwnersRes.json();
          setSalesOwners(salesOwnersData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-fill company info when selected
  useEffect(() => {
    if (selectedCompany) {
      const company = companies.find(c => c.id === selectedCompany);
      if (company) {
        setCustomerName(company.name);
        setPhone(company.phone || '');
        setEmail(company.email || '');
      }
    }
  }, [selectedCompany, companies]);

  // Auto-set rate when room type changes
  useEffect(() => {
    if (roomType) {
      const selectedRoomType = roomTypes.find(rt => rt.name === roomType);
      if (selectedRoomType) {
        setRate(parseFloat(selectedRoomType.baseRate) || 2500);
      }
    }
  }, [roomType, roomTypes]);

  // Check availability when dates/room type change
  useEffect(() => {
    const checkAvailability = async () => {
      if (!checkIn || !checkOut || !roomType) {
        setAvailabilityMessage(null);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/bookings/check-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkIn, checkOut, roomType }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.available !== undefined) {
            const available = data.data.available;
            if (available < numberOfRooms) {
              setAvailabilityMessage(`⚠️ มีห้องว่างเพียง ${available} ห้อง`);
            } else {
              setAvailabilityMessage(`✓ มีห้องว่าง ${available} ห้อง`);
            }
          }
        }
      } catch (error) {
        console.error('Error checking availability:', error);
      }
    };

    checkAvailability();
  }, [checkIn, checkOut, roomType, numberOfRooms]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileNames = Array.from(e.target.files).map(f => f.name);
      setUploadedFiles([...uploadedFiles, ...fileNames]);
    }
  };

  const validateAndCreateBooking = async () => {
    setErrors([]);
    const newErrors: string[] = [];

    // Validation
    if (!customerName.trim()) newErrors.push('กรุณากรอกชื่อ/บริษัท');
    if (!saleOwner) newErrors.push('กรุณาเลือก Sale Owner');
    if (!phone.trim()) newErrors.push('กรุณากรอกเบอร์ติดต่อ');
    if (!email.trim()) newErrors.push('กรุณากรอกอีเมล');
    if (!checkIn) newErrors.push('กรุณาเลือกวันเช็คอิน');
    if (!checkOut) newErrors.push('กรุณาเลือกวันเช็คเอาท์');
    if (!roomType) newErrors.push('กรุณาเลือกประเภทห้อง');
    if (numberOfRooms < 1) newErrors.push('จำนวนห้องต้องมากกว่า 0');
    if (rate < 0) newErrors.push('ราคาต้องมากกว่าหรือเท่ากับ 0');
    if (!paymentMethod) newErrors.push('กรุณาเลือกวิธีชำระเงิน');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      newErrors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
      newErrors.push('วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน');
    }

    // Check if check-in is not in the past
    if (checkIn && new Date(checkIn) < new Date(new Date().toDateString())) {
      newErrors.push('วันเช็คอินต้องไม่เป็นวันที่ผ่านมาแล้ว');
    }

    if (hasDocuments && uploadedFiles.length === 0) {
      newErrors.push('กรุณาแนบเอกสาร (QT)');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create booking via API
      const bookingPayload: BookingPayload = {
        customerName,
        company: customerName,
        saleOwner,
        phone,
        email,
        checkIn,
        checkOut,
        roomType,
        numberOfRooms,
        rate,
        paymentMethod,
        documents: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        notes: notes || undefined,
      };

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการสร้างการจอง');
      }

      const booking = result.data;

      // Calculate nights and total
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const total = rate * numberOfRooms * nights;

      setBookingSummary({
        ...booking,
        nights,
        total,
      });
      setSuccess(true);
    } catch (error: any) {
      setErrors([error.message || 'เกิดข้อผิดพลาดในการสร้างการจอง']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingSummary) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingSummary.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'เกิดข้อผิดพลาดในการยืนยันการจอง');
      }

      setBookingSummary({
        ...bookingSummary,
        status: 'CONFIRMED',
      });
    } catch (error: any) {
      setErrors([error.message || 'เกิดข้อผิดพลาดในการยืนยันการจอง']);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (success && bookingSummary) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-900 mb-2">
                {bookingSummary.status === 'CONFIRMED' ? 'ยืนยันการจองสำเร็จ!' : 'สร้างการจองสำเร็จ!'}
              </h1>
              <p className="text-gray-600">
                การจองของคุณอยู่ในสถานะ{bookingSummary.status === 'CONFIRMED' ? 'ยืนยันแล้ว' : 'รอยืนยัน'} ({bookingSummary.status})
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">สรุปการจอง</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Booking ID</p>
                  <p className="font-medium text-gray-900">{bookingSummary.bookingId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">สถานะ</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    bookingSummary.status === 'CONFIRMED' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {bookingSummary.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="font-medium text-gray-800 mb-3">ข้อมูลลูกค้า</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ชื่อ/บริษัท:</span>
                    <span className="text-gray-900">{bookingSummary.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Owner:</span>
                    <span className="text-gray-900">{bookingSummary.saleOwner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">เบอร์ติดต่อ:</span>
                    <span className="text-gray-900">{bookingSummary.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">อีเมล:</span>
                    <span className="text-gray-900">{bookingSummary.email}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <h3 className="font-medium text-gray-800 mb-3">รายละเอียดการจอง</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in:</span>
                    <span className="text-gray-900">{bookingSummary.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out:</span>
                    <span className="text-gray-900">{bookingSummary.checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">จำนวนคืน:</span>
                    <span className="text-gray-900">{bookingSummary.nights} คืน</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ประเภทห้อง:</span>
                    <span className="text-gray-900">{bookingSummary.roomType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">จำนวนห้อง:</span>
                    <span className="text-gray-900">{bookingSummary.numberOfRooms} ห้อง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ราคาต่อห้องต่อคืน:</span>
                    <span className="text-gray-900">฿{bookingSummary.rate.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">วิธีชำระเงิน:</span>
                    <span className="text-gray-900">{bookingSummary.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">ราคารวม:</span>
                  <span className="text-2xl font-bold text-green-600">฿{bookingSummary.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {bookingSummary.status === 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="font-medium text-yellow-900 mb-2">ข้อมูลสำคัญ:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                  <li>ห้องถูก Block แบบ On-Hold</li>
                  <li>หมดอายุการ Hold: {bookingSummary.holdExpiry ? new Date(bookingSummary.holdExpiry).toLocaleString('th-TH') : '-'}</li>
                  <li>ระบบได้ส่งแจ้งเตือนไปยัง: Sales, Front Office, Housekeeping</li>
                </ul>
              </div>
            )}

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900 mb-2">พบข้อผิดพลาด:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Link
                to="/dashboard"
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                กลับไปหน้าหลัก
              </Link>
              {bookingSummary.status === 'PENDING' && (
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  คอนเฟิร์มการจอง
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับไปหน้าหลัก
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Hotel className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-green-900">จองห้องพัก</h1>
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 mb-2">พบข้อผิดพลาด:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลลูกค้า</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลือกบริษัท (ถ้ามี)
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- เลือกบริษัท --</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ/บริษัท <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="ชื่อลูกค้าหรือบริษัท"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sale Owner <span className="text-red-500">*</span>
                </label>
                <select
                  value={saleOwner}
                  onChange={(e) => setSaleOwner(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- เลือก Sale Owner --</option>
                  {salesOwners.map((owner) => (
                    <option key={owner.id} value={owner.name}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์ติดต่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0X-XXXX-XXXX"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">รายละเอียดการจอง</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทห้อง <span className="text-red-500">*</span>
                </label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- เลือกประเภทห้อง --</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.name}>
                      {rt.name} (฿{parseFloat(rt.baseRate).toLocaleString()}/คืน)
                    </option>
                  ))}
                </select>
                {availabilityMessage && (
                  <p className={`mt-2 text-sm ${availabilityMessage.includes('⚠️') ? 'text-orange-600' : 'text-green-600'}`}>
                    {availabilityMessage}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate (ราคาต่อห้องต่อคืน) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วิธีชำระเงิน <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- เลือกวิธีชำระเงิน --</option>
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเหตุ
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>
            </div>
          </div>

          {/* Price Summary */}
          {checkIn && checkOut && roomType && numberOfRooms > 0 && rate > 0 && (
            <div className="mb-8 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">ประมาณการราคา</h3>
              {(() => {
                const nights = Math.ceil(
                  (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
                );
                const total = rate * numberOfRooms * nights;
                return (
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">
                      {numberOfRooms} ห้อง × {nights} คืน × ฿{rate.toLocaleString()} = <span className="font-semibold text-green-700">฿{total.toLocaleString()}</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Documents */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">เอกสารแนบ</h2>
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDocuments}
                  onChange={(e) => setHasDocuments(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">ต้องการแนบเอกสาร (QT)</span>
              </label>
            </div>

            {hasDocuments && (
              <div>
                <label className="block w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 cursor-pointer transition-colors">
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Upload className="w-5 h-5" />
                    <span>คลิกเพื่ออัปโหลดไฟล์</span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </label>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{file}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))}
                          className="ml-auto text-red-500 hover:text-red-700 text-sm"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={validateAndCreateBooking}
            disabled={isSubmitting}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            สร้างการจอง
          </button>
        </div>
      </div>
    </div>
  );
}