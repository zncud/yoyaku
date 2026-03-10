"use client";

import { useBooking, useBookingDispatch } from "../_context/BookingContext";
import type { Menu } from "@/lib/types";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function MenuCard({
  menu,
  selected,
  onToggle,
}: {
  menu: Menu;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        group relative flex w-full items-center justify-between rounded-xl border p-4
        text-left transition-all duration-200
        ${selected
          ? "border-gold bg-gold/5 shadow-md shadow-gold/10"
          : "border-greige-light bg-white hover:border-greige hover:shadow-sm"
        }
      `}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div
            className={`
              flex h-5 w-5 shrink-0 items-center justify-center rounded
              border transition-all
              ${selected
                ? "border-gold bg-gold"
                : "border-greige group-hover:border-slate"
              }
            `}
          >
            {selected && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div>
            <p className={`font-bold tracking-wide ${selected ? "text-gold-dark" : "text-charcoal"}`}>
              {menu.name}
            </p>
            {menu.description && (
              <p className="mt-0.5 text-xs text-slate">{menu.description}</p>
            )}
          </div>
        </div>
      </div>

      <span
        className={`
          shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide
          ${selected
            ? "bg-gold/15 text-gold-dark"
            : "bg-ivory-dark text-slate"
          }
        `}
      >
        {formatDuration(menu.duration_minutes)}
      </span>
    </button>
  );
}

export default function StepMenu() {
  const { booking, storeData } = useBooking();
  const dispatch = useBookingDispatch();
  const { menus } = storeData;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-black tracking-wider text-charcoal uppercase">
          Menu
        </h2>
        <p className="mt-1 text-sm text-slate">
          施術メニューをお選びください（複数選択可）
        </p>
      </div>

      {menus.length === 0 ? (
        <div className="rounded-xl border border-greige-light bg-white p-8 text-center">
          <p className="text-sm text-slate">
            現在メニューが登録されていません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              selected={booking.menus.some((m) => m.id === menu.id)}
              onToggle={() => dispatch({ type: "TOGGLE_MENU", payload: menu })}
            />
          ))}
        </div>
      )}

      {booking.menus.length > 0 && (
        <div className="mt-6 rounded-xl border border-gold/25 bg-gold/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider text-gold-dark uppercase">
                Selected
              </p>
              <p className="mt-0.5 text-sm text-charcoal-light">
                {booking.menus.map((m) => m.name).join(" + ")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium tracking-wider text-gold-dark uppercase">
                Total
              </p>
              <p className="mt-0.5 text-lg font-black text-gold-dark">
                {formatDuration(booking.totalDuration)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
