import { db } from './index';
import { roomTypes, companies, salesOwners, blackoutDates, minimumStayRules, bookings } from './schema';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Seed Room Types
    console.log('Seeding room types...');
    await db.insert(roomTypes).values([
      { id: nanoid(), name: 'ห้องดีลักซ์', nameEn: 'Deluxe Room', totalRooms: 20 },
      { id: nanoid(), name: 'ห้องซูพีเรียร์', nameEn: 'Superior Room', totalRooms: 15 },
      { id: nanoid(), name: 'ห้องสวีท', nameEn: 'Suite', totalRooms: 8 },
      { id: nanoid(), name: 'ห้องเอ็กเซ็กคิวทีฟ', nameEn: 'Executive Suite', totalRooms: 5 },
    ]);

    // Seed Companies
    console.log('Seeding companies...');
    await db.insert(companies).values([
      { id: nanoid(), name: 'บริษัท ไทยออยล์ จำกัด' },
      { id: nanoid(), name: 'บริษัท ปตท. จำกัด' },
      { id: nanoid(), name: 'บริษัท เซ็นทรัล กรุ๊ป จำกัด' },
      { id: nanoid(), name: 'บริษัท ไมเนอร์ อินเตอร์เนชั่นแนล จำกัด' },
      { id: nanoid(), name: 'บริษัท ซีพี ออลล์ จำกัด' },
      { id: nanoid(), name: 'Walk-in / Individual' },
    ]);

    // Seed Sales Owners
    console.log('Seeding sales owners...');
    await db.insert(salesOwners).values([
      { id: nanoid(), name: 'คุณสมชาย ใจดี', email: 'somchai@hotel.com', phone: '081-111-1111', active: true },
      { id: nanoid(), name: 'คุณสมหญิง รักงาน', email: 'somying@hotel.com', phone: '081-222-2222', active: true },
      { id: nanoid(), name: 'คุณประเสริฐ มั่นคง', email: 'prasert@hotel.com', phone: '081-333-3333', active: true },
      { id: nanoid(), name: 'คุณวิภา เก่งขาย', email: 'wipa@hotel.com', phone: '081-444-4444', active: true },
    ]);

    // Seed Blackout Dates
    console.log('Seeding blackout dates...');
    await db.insert(blackoutDates).values([
      { id: nanoid(), date: '2025-12-24', reason: 'Christmas Eve' },
      { id: nanoid(), date: '2025-12-25', reason: 'Christmas Day' },
      { id: nanoid(), date: '2025-12-31', reason: 'New Year Eve' },
      { id: nanoid(), date: '2026-01-01', reason: 'New Year Day' },
    ]);

    // Seed Minimum Stay Rules
    console.log('Seeding minimum stay rules...');
    await db.insert(minimumStayRules).values([
      { 
        id: nanoid(), 
        startDate: '2025-12-20', 
        endDate: '2026-01-05', 
        minNights: 3 
      },
    ]);

    // Seed Sample Bookings
    console.log('Seeding sample bookings...');
    const holdExpiry1 = new Date();
    holdExpiry1.setDate(holdExpiry1.getDate() + 7);

    await db.insert(bookings).values([
      {
        id: nanoid(),
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
        rate: '2500.00',
        paymentMethod: 'วางบิล (Credit Term)',
        status: 'PENDING',
        holdExpiry: holdExpiry1,
      },
      {
        id: nanoid(),
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
        rate: '3000.00',
        paymentMethod: 'บัตรเครดิต',
        status: 'CONFIRMED',
      },
    ]);

    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } 
}

seed();