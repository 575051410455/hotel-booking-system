import { db } from './index';
import { roomTypes, salesOwners, companies } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed Room Types
  const roomTypeData = [
    { id: '1', name: 'Standard Room', totalRooms: 20, baseRate: '1500.00', description: 'Comfortable standard room with basic amenities' },
    { id: '2', name: 'Deluxe Room', totalRooms: 15, baseRate: '2500.00', description: 'Spacious deluxe room with premium amenities' },
    { id: '3', name: 'Superior Room', totalRooms: 10, baseRate: '3500.00', description: 'Superior room with city view' },
    { id: '4', name: 'Suite', totalRooms: 5, baseRate: '5000.00', description: 'Luxury suite with separate living area' },
    { id: '5', name: 'Family Room', totalRooms: 8, baseRate: '4000.00', description: 'Large room suitable for families' },
  ];

  console.log('  Creating room types...');
  for (const rt of roomTypeData) {
    await db.insert(roomTypes).values(rt).onConflictDoNothing();
  }

//   // Seed Sales Owners
//   const salesOwnerData = [
//     { id: '1', name: 'สมชาย ใจดี', email: 'somchai@hotel.com', phone: '081-111-1111', isActive: true },
//     { id: '2', name: 'สมหญิง รักงาน', email: 'somying@hotel.com', phone: '081-222-2222', isActive: true },
//     { id: '3', name: 'วิชัย ขยัน', email: 'wichai@hotel.com', phone: '081-333-3333', isActive: true },
//     { id: '4', name: 'พิมพ์ใจ สดใส', email: 'pimjai@hotel.com', phone: '081-444-4444', isActive: true },
//     { id: '5', name: 'ธนา รวยดี', email: 'thana@hotel.com', phone: '081-555-5555', isActive: true },
//   ];

//   console.log('  Creating sales owners...');
//   for (const so of salesOwnerData) {
//     await db.insert(salesOwners).values(so).onConflictDoNothing();
//   }

//   // Seed Companies
//   const companyData = [
//     { id: '1', name: 'บริษัท ABC จำกัด', contactPerson: 'คุณเอ', email: 'contact@abc.co.th', phone: '02-111-1111', creditTerms: 30, isActive: true },
//     { id: '2', name: 'บริษัท XYZ จำกัด (มหาชน)', contactPerson: 'คุณบี', email: 'contact@xyz.co.th', phone: '02-222-2222', creditTerms: 45, isActive: true },
//     { id: '3', name: 'บริษัท ไทยทราเวล จำกัด', contactPerson: 'คุณซี', email: 'info@thaitravel.com', phone: '02-333-3333', creditTerms: 30, isActive: true },
//     { id: '4', name: 'หจก. สุขสันต์ทัวร์', contactPerson: 'คุณดี', email: 'booking@suksantour.com', phone: '02-444-4444', creditTerms: 15, isActive: true },
//     { id: '5', name: 'บริษัท Global Corp', contactPerson: 'Mr. John', email: 'john@globalcorp.com', phone: '02-555-5555', creditTerms: 60, isActive: true },
//   ];

//   console.log('  Creating companies...');
//   for (const c of companyData) {
//     await db.insert(companies).values(c).onConflictDoNothing();
//   }

//   console.log('✅ Seeding completed!');
//   process.exit(0);
// }
}
seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});