"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { Store, Staff, Menu, BookingState, WizardStep } from "@/lib/types";

/* ── Store Data (サーバーから渡される初期データ) ── */
interface StoreData {
  store: Store;
  staffs: Staff[];
  menus: Menu[];
  bookingMonthsAhead: number;
  minAdvanceDays: number;
}

/* ── State ── */
interface State {
  storeData: StoreData;
  booking: BookingState;
  currentStep: WizardStep;
}

/* ── Actions ── */
type Action =
  | { type: "SET_STAFF"; payload: Staff | null }
  | { type: "TOGGLE_MENU"; payload: Menu }
  | { type: "SET_DATE"; payload: Date | null }
  | { type: "SET_SLOT"; payload: string }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "RESET" };

const STEPS: WizardStep[] = ["staff", "menu", "datetime", "confirm"];

function getInitialState(storeData: StoreData): State {
  return {
    storeData,
    booking: {
      storeId: storeData.store.id,
      staff: storeData.staffs.length === 1 ? storeData.staffs[0] : null,
      menus: [],
      selectedDate: null,
      selectedSlot: null,
      totalDuration: 0,
    },
    currentStep: storeData.staffs.length <= 1 ? "menu" : "staff",
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STAFF":
      return {
        ...state,
        booking: { ...state.booking, staff: action.payload },
      };
    case "TOGGLE_MENU": {
      const exists = state.booking.menus.find(
        (m) => m.id === action.payload.id
      );
      const menus = exists
        ? state.booking.menus.filter((m) => m.id !== action.payload.id)
        : [...state.booking.menus, action.payload];
      const totalDuration = menus.reduce(
        (sum, m) => sum + m.duration_minutes,
        0
      );
      return {
        ...state,
        booking: { ...state.booking, menus, totalDuration },
      };
    }
    case "SET_DATE":
      return {
        ...state,
        booking: {
          ...state.booking,
          selectedDate: action.payload,
          selectedSlot: null,
        },
      };
    case "SET_SLOT":
      return {
        ...state,
        booking: { ...state.booking, selectedSlot: action.payload },
      };
    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload };
    case "RESET":
      return getInitialState(state.storeData);
    default:
      return state;
  }
}

/* ── Context ── */
const BookingContext = createContext<State | null>(null);
const BookingDispatchContext = createContext<Dispatch<Action> | null>(null);

export function BookingProvider({
  store,
  staffs,
  menus,
  bookingMonthsAhead = 3,
  minAdvanceDays = 0,
  children,
}: {
  store: Store;
  staffs: Staff[];
  menus: Menu[];
  bookingMonthsAhead?: number;
  minAdvanceDays?: number;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    getInitialState({ store, staffs, menus, bookingMonthsAhead, minAdvanceDays })
  );
  return (
    <BookingContext.Provider value={state}>
      <BookingDispatchContext.Provider value={dispatch}>
        {children}
      </BookingDispatchContext.Provider>
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

export function useBookingDispatch() {
  const ctx = useContext(BookingDispatchContext);
  if (!ctx)
    throw new Error("useBookingDispatch must be used within BookingProvider");
  return ctx;
}

export { STEPS };
