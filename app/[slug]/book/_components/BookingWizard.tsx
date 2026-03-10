"use client";

import {
  BookingProvider,
  useBooking,
  useBookingDispatch,
  STEPS,
} from "../_context/BookingContext";
import StepStaff from "./StepStaff";
import StepMenu from "./StepMenu";
import StepDatetime from "./StepDatetime";
import StepConfirm from "./StepConfirm";
import type { Store, Staff, Menu, WizardStep } from "@/lib/types";

/* ── Step Metadata ── */
const STEP_META: Record<WizardStep, { label: string; number: number }> = {
  staff:    { label: "スタッフ選択", number: 1 },
  menu:     { label: "メニュー選択", number: 2 },
  datetime: { label: "日時選択",     number: 3 },
  confirm:  { label: "予約確認",     number: 4 },
};

/* ── Progress Bar ── */
function StepIndicator() {
  const { currentStep } = useBooking();
  const currentIdx = STEPS.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-0 px-4 py-8">
      {STEPS.map((step, idx) => {
        const meta = STEP_META[step];
        const isActive = idx === currentIdx;
        const isCompleted = idx < currentIdx;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  text-sm font-bold tracking-wide transition-all duration-300
                  ${isActive
                    ? "bg-gold text-white shadow-[0_0_20px_rgba(196,162,101,0.35)] scale-110"
                    : isCompleted
                      ? "bg-gold/80 text-white"
                      : "border-2 border-greige-light text-greige"
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  meta.number
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium tracking-wider transition-colors duration-300
                  ${isActive ? "text-gold-dark" : isCompleted ? "text-gold" : "text-greige"}
                `}
              >
                {meta.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`
                  mx-2 h-[2px] w-12 sm:w-20 transition-colors duration-300 mt-[-1.25rem]
                  ${idx < currentIdx ? "bg-gold/50" : "bg-greige-light"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Navigation Buttons ── */
function WizardNav() {
  const { currentStep, booking } = useBooking();
  const dispatch = useBookingDispatch();
  const currentIdx = STEPS.indexOf(currentStep);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case "staff":
        return booking.staff !== null;
      case "menu":
        return booking.menus.length > 0;
      case "datetime":
        return booking.selectedDate !== null && booking.selectedSlot !== null;
      case "confirm":
        return false;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentIdx < STEPS.length - 1) {
      dispatch({ type: "GO_TO_STEP", payload: STEPS[currentIdx + 1] });
    }
  };

  const goBack = () => {
    if (currentIdx > 0) {
      dispatch({ type: "GO_TO_STEP", payload: STEPS[currentIdx - 1] });
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-6">
      {currentIdx > 0 ? (
        <button
          onClick={goBack}
          className="flex items-center gap-2 rounded-lg border border-greige-light px-5 py-2.5
                     text-sm font-medium text-slate transition-all
                     hover:border-greige hover:text-charcoal"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </button>
      ) : (
        <div />
      )}

      {currentStep !== "confirm" && (
        <button
          onClick={goNext}
          disabled={!canGoNext()}
          className={`
            flex items-center gap-2 rounded-lg px-7 py-2.5 text-sm font-bold
            tracking-wide transition-all duration-200
            ${canGoNext()
              ? "bg-gold text-white shadow-md shadow-gold/20 hover:bg-gold-light hover:shadow-gold/30 active:scale-[0.97]"
              : "cursor-not-allowed bg-greige-light text-greige"
            }
          `}
        >
          次へ
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Step Renderer ── */
function WizardBody() {
  const { currentStep } = useBooking();

  return (
    <div className="min-h-[400px] px-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {currentStep === "staff" && <StepStaff />}
        {currentStep === "menu" && <StepMenu />}
        {currentStep === "datetime" && <StepDatetime />}
        {currentStep === "confirm" && <StepConfirm />}
      </div>
    </div>
  );
}

/* ── Inner Wizard (needs context) ── */
function WizardInner({ storeName }: { storeName: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-greige-light px-6 pt-8 pb-2">
        <h1 className="text-center text-2xl font-black tracking-widest text-charcoal uppercase">
          Reservation
        </h1>
        <p className="mt-1 text-center text-xs tracking-[0.3em] text-gold">
          {storeName}
        </p>
      </header>

      <StepIndicator />
      <WizardBody />
      <WizardNav />

      <footer className="border-t border-greige-light px-6 py-4 text-center text-xs text-greige">
        Powered by Yoyaku
      </footer>
    </div>
  );
}

/* ── BookingWizard (Entry Point) ── */
export default function BookingWizard({
  store,
  staffs,
  menus,
  bookingMonthsAhead = 3,
  minAdvanceDays = 0,
}: {
  store: Store;
  staffs: Staff[];
  menus: Menu[];
  bookingMonthsAhead?: number;
  minAdvanceDays?: number;
}) {
  return (
    <BookingProvider store={store} staffs={staffs} menus={menus} bookingMonthsAhead={bookingMonthsAhead} minAdvanceDays={minAdvanceDays}>
      <WizardInner storeName={store.name} />
    </BookingProvider>
  );
}
