export interface Store {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  hero_image_url: string | null;
  owner_id: string;
}

export interface Staff {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Menu {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
}

export interface Booking {
  id: string;
  store_id: string;
  staff_id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  total_duration: number;
  status: "reserved" | "cancelled" | "completed";

  created_at: string;
}

export interface BookingState {
  storeId: string;
  staff: Staff | null;
  menus: Menu[];
  selectedDate: Date | null;
  selectedSlot: string | null;
  totalDuration: number;
}

export type WizardStep = "staff" | "menu" | "datetime" | "confirm";
