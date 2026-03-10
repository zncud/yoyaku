"use client";

import { useBooking, useBookingDispatch } from "../_context/BookingContext";
import type { Staff } from "@/lib/types";

function StaffCard({
  staff,
  selected,
  onSelect,
}: {
  staff: Staff;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = staff.name.slice(0, 1);

  return (
    <button
      onClick={onSelect}
      className={`
        group relative flex w-full items-center gap-4 rounded-xl border p-4
        text-left transition-all duration-200
        ${selected
          ? "border-gold bg-gold/5 shadow-md shadow-gold/10"
          : "border-greige-light bg-white hover:border-greige hover:shadow-sm"
        }
      `}
    >
      <div
        className={`
          flex h-14 w-14 shrink-0 items-center justify-center rounded-full
          text-lg font-black transition-colors
          ${selected
            ? "bg-gold text-white"
            : "bg-ivory-dark text-slate group-hover:bg-greige-light"
          }
        `}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`font-bold tracking-wide ${selected ? "text-gold-dark" : "text-charcoal"}`}>
          {staff.name}
        </p>
        {staff.description && (
          <p className="mt-0.5 truncate text-xs text-slate">
            {staff.description}
          </p>
        )}
      </div>

      {selected && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function StepStaff() {
  const { booking, storeData } = useBooking();
  const dispatch = useBookingDispatch();
  const { staffs } = storeData;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black tracking-wider text-charcoal uppercase">
          Staff
        </h2>
        <p className="mt-1 text-sm text-slate">
          担当スタッフをお選びください
        </p>
      </div>

      {staffs.length === 0 ? (
        <div className="rounded-xl border border-greige-light bg-white p-8 text-center">
          <p className="text-sm text-slate">
            現在スタッフが登録されていません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {staffs.map((staff) => (
            <StaffCard
              key={staff.id}
              staff={staff}
              selected={booking.staff?.id === staff.id}
              onSelect={() => dispatch({ type: "SET_STAFF", payload: staff })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
