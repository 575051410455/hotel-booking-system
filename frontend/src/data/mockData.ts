export interface RoomType {
  id: string;
  name: string;
  nameEn: string;
  totalRooms: number;
}

export interface Company {
  id: string;
  name: string;
}

export interface Booking {
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
  rate: number;
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
    changes: AmendLog[];
  }[];
}

export const roomTypes: RoomType[] = [
  { id: 'deluxe', name: 'ห้องดีลักซ์', nameEn: 'Deluxe Room', totalRooms: 20 },
  { id: 'superior', name: 'ห้องซูพีเรียร์', nameEn: 'Superior Room', totalRooms: 15 },
  { id: 'suite', name: 'ห้องสวีท', nameEn: 'Suite', totalRooms: 8 },
  { id: 'executive', name: 'ห้องเอ็กเซ็กคิวทีฟ', nameEn: 'Executive Suite', totalRooms: 5 },
];

export const companies: Company[] = [
  { id: '1', name: 'บริษัท ไทยออยล์ จำกัด' },
  { id: '2', name: 'บริษัท ปตท. จำกัด' },
  { id: '3', name: 'บริษัท เซ็นทรัล กรุ๊ป จำกัด' },
  { id: '4', name: 'บริษัท ไมเนอร์ อินเตอร์เนชั่นแนล จำกัด' },
  { id: '5', name: 'บริษัท ซีพี ออลล์ จำกัด' },
  { id: '6', name: 'Walk-in / Individual' },
];

export const salesOwners = [
  'คุณสมชาย ใจดี',
  'คุณสมหญิง รักงาน',
  'คุณประเสริฐ มั่นคง',
  'คุณวิภา เก่งขาย',
];

export const paymentMethods = [
  'เงินสด',
  'โอนธนาคาร',
  'บัตรเครดิต',
  'วางบิล (Credit Term)',
];

export const cancelReasons = [
  'ลูกค้ายกเลิก',
  'ลดจำนวนห้อง',
  'เปลี่ยนวันเข้าพัก',
  'ข้อผิดพลาดระบบ',
  'ไม่มาตามนัด (No Show)',
  'อื่นๆ',
];

// Mock bookings data
let mockBookings: Booking[] = [
  {
    id: '1',
    bookingId: 'BK2025001',
    customerName: 'บริษัท ไทยออยล์ จำกัด',
    company: 'บริษัท ไทยออยล์ จำกัด',
    saleOwner: 'คุณสมชาย ใจดี',
    phone: '02-123-4567',
    email: 'booking@thaioil.com',
    checkIn: '2025-12-01',
    checkOut: '2025-12-05',
    roomType: 'ห้องดีลักซ์',
    numberOfRooms: 5,
    rate: 2500,
    paymentMethod: 'วางบิล (Credit Term)',
    status: 'PENDING',
    createdAt: '2025-11-20T10:30:00',
    holdExpiry: '2025-11-27T10:30:00',
  },
  {
    id: '2',
    bookingId: 'BK2025002',
    customerName: 'คุณสมศักดิ์ ทองดี',
    company: 'Walk-in / Individual',
    saleOwner: 'คุณวิภา เก่งขาย',
    phone: '081-234-5678',
    email: 'somsak@email.com',
    checkIn: '2025-11-28',
    checkOut: '2025-11-30',
    roomType: 'ห้องซูพีเรียร์',
    numberOfRooms: 2,
    rate: 3000,
    paymentMethod: 'บัตรเครดิต',
    status: 'CONFIRMED',
    createdAt: '2025-11-18T14:20:00',
  },
];

// Mock blocked dates (blackout dates)
export const blackoutDates: string[] = [
  '2025-12-24',
  '2025-12-25',
  '2025-12-31',
  '2026-01-01',
];

// Minimum stay requirements (date range -> minimum nights)
export const minimumStayRules: { startDate: string; endDate: string; minNights: number }[] = [
  { startDate: '2025-12-20', endDate: '2026-01-05', minNights: 3 },
];

export const getBookings = (): Booking[] => {
  return mockBookings;
};

export const addBooking = (booking: Booking): void => {
  mockBookings.push(booking);
};

export const updateBookingStatus = (bookingId: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VOID'): boolean => {
  const booking = mockBookings.find(b => b.bookingId === bookingId);
  if (booking) {
    booking.status = status;
    return true;
  }
  return false;
};

export const updateBooking = (bookingId: string, updatedData: Partial<Booking>): boolean => {
  const booking = mockBookings.find(b => b.bookingId === bookingId);
  if (booking) {
    Object.assign(booking, updatedData);
    return true;
  }
  return false;
};

export const deleteBooking = (bookingId: string): boolean => {
  const index = mockBookings.findIndex(b => b.bookingId === bookingId);
  if (index !== -1) {
    mockBookings.splice(index, 1);
    return true;
  }
  return false;
};

export const cancelBooking = (
  bookingId: string, 
  cancelReason: string, 
  cancelDocuments: string[], 
  cancelledBy: string
): boolean => {
  const booking = mockBookings.find(b => b.bookingId === bookingId);
  if (booking) {
    // PENDING -> VOID, CONFIRMED -> CANCELLED
    booking.status = booking.status === 'PENDING' ? 'VOID' : 'CANCELLED';
    booking.cancelReason = cancelReason;
    booking.cancelDocuments = cancelDocuments.length > 0 ? cancelDocuments : undefined;
    booking.cancelledAt = new Date().toISOString();
    booking.cancelledBy = cancelledBy;
    return true;
  }
  return false;
};

export interface AmendLog {
  field: string;
  before: any;
  after: any;
}

export const amendBooking = (
  bookingId: string,
  amendments: Partial<Booking>,
  amendedBy: string,
  amendLogs: AmendLog[]
): { success: boolean; message: string } => {
  const booking = mockBookings.find(b => b.bookingId === bookingId);
  
  if (!booking) {
    return { success: false, message: 'ไม่พบข้อมูลการจอง' };
  }

  // Check status
  if (booking.status === 'CANCELLED' || booking.status === 'VOID') {
    return { success: false, message: 'ไม่สามารถแก้ไขการจองที่ถูกยกเลิกได้' };
  }

  // If CONFIRMED, check allowed fields
  if (booking.status === 'CONFIRMED') {
    const allowedFields = ['customerName', 'phone', 'email', 'company'];
    const hasRestrictedChanges = Object.keys(amendments).some(
      key => !allowedFields.includes(key) && key !== 'checkIn' && key !== 'checkOut' && key !== 'roomType' && key !== 'numberOfRooms'
    );
    
    // For confirmed bookings, we allow some changes but need to track them
  }

  // Check availability if dates/rooms/type changed
  if (amendments.checkIn || amendments.checkOut || amendments.roomType || amendments.numberOfRooms) {
    const newCheckIn = amendments.checkIn || booking.checkIn;
    const newCheckOut = amendments.checkOut || booking.checkOut;
    const newRoomType = amendments.roomType || booking.roomType;
    const newNumberOfRooms = amendments.numberOfRooms || booking.numberOfRooms;

    const availability = checkRoomAvailability(newCheckIn, newCheckOut, newRoomType);
    
    if (availability < newNumberOfRooms) {
      return { 
        success: false, 
        message: `ห้องไม่เพียงพอ มีห้องว่างเพียง ${availability} ห้อง แต่ต้องการ ${newNumberOfRooms} ห้อง` 
      };
    }
  }

  // Apply amendments
  Object.assign(booking, amendments);
  
  // Add amendment metadata
  booking.lastAmendedAt = new Date().toISOString();
  booking.lastAmendedBy = amendedBy;
  if (!booking.amendmentLogs) {
    booking.amendmentLogs = [];
  }
  booking.amendmentLogs.push({
    timestamp: new Date().toISOString(),
    amendedBy,
    changes: amendLogs,
  });

  return { success: true, message: 'แก้ไขการจองสำเร็จ' };
};

export const generateBookingId = (): string => {
  const year = new Date().getFullYear();
  const count = mockBookings.length + 1;
  return `BK${year}${String(count).padStart(3, '0')}`;
};

// Function to check room availability
function checkRoomAvailability(checkIn: string, checkOut: string, roomType: string): number {
  // This is a placeholder function. In a real application, you would query your database
  // to check the availability of rooms based on the check-in and check-out dates.
  // For demonstration purposes, we'll assume all rooms are available.
  const roomTypeInfo = roomTypes.find(rt => rt.name === roomType);
  return roomTypeInfo ? roomTypeInfo.totalRooms : 0;
}