import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/hooks/client';


// ============================================================================
// QUERIES (GET requests)
// ============================================================================

/**
 * Hook: รายการการจองทั้งหมด
 */
export function useBookings(filters?: {
  status?: string;
  roomType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['bookings', filters],
    queryFn: async () => {
      const res = await client.bookings.$get({
        query: filters as any,
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }
      
      return res.json();
    },
  });
}

/**
 * Hook: รายละเอียดการจอง 1 รายการ
 */
export function useBooking(bookingId: string) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const res = await client.bookings[':id'].$get({
        param: { id: bookingId },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch booking');
      }
      
      return res.json();
    },
    enabled: !!bookingId, // เรียกเมื่อมี bookingId เท่านั้น
  });
}

/**
 * Hook: ประเภทห้องทั้งหมด
 */
export function useRoomTypes() {
  return useQuery({
    queryKey: ['roomTypes'],
    queryFn: async () => {
      const res = await client.master['room-types'].$get();
      
      if (!res.ok) {
        throw new Error('Failed to fetch room types');
      }
      
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache 5 นาที (ข้อมูล master ไม่ค่อยเปลี่ยน)
  });
}

/**
 * Hook: บริษัททั้งหมด
 */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await client.master.companies.$get();
      
      if (!res.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Sales Owners ทั้งหมด
 */
export function useSalesOwners() {
  return useQuery({
    queryKey: ['salesOwners'],
    queryFn: async () => {
      const res = await client.master['sales-owners'].$get();
      
      if (!res.ok) {
        throw new Error('Failed to fetch sales owners');
      }
      
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// MUTATIONS (POST/PUT/DELETE requests)
// ============================================================================

/**
 * Hook: สร้างการจองใหม่
 */
export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await client.bookings.$post({
        json: data,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create booking');
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries เพื่อ refetch ข้อมูลใหม่
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook: ยืนยันการจอง
 */
export function useConfirmBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await client.bookings[':id'].confirm.$post({
        param: { id: bookingId },
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to confirm booking');
      }
      
      return res.json();
    },
    onSuccess: (_, bookingId) => {
      // Invalidate เฉพาะการจองนี้
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook: ยกเลิกการจอง
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      cancelData 
    }: { 
      bookingId: string; 
      cancelData: any;
    }) => {
      const res = await client.bookings[':id'].cancel.$post({
        param: { id: bookingId },
        json: cancelData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel booking');
      }
      
      return res.json();
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook: แก้ไขการจอง
 */
export function useAmendBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      amendData 
    }: { 
      bookingId: string; 
      amendData: any;
    }) => {
      const res = await client.bookings[':id'].amend.$post({
        param: { id: bookingId },
        json: amendData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to amend booking');
      }
      
      return res.json();
    },
    onSuccess: (_, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

/**
 * Hook: ตรวจสอบห้องว่าง
 */
export function useCheckAvailability() {
  return useMutation({
    mutationFn: async (data: {
      checkIn: string;
      checkOut: string;
      roomType: string;
    }) => {
      const res = await client.bookings['check-availability'].$post({
        json: data,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to check availability');
      }
      
      return res.json();
    },
  });
}