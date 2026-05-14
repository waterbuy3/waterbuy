import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Sun, Moon, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

const SLOT_ICONS: Record<number, React.ElementType> = { 0: Sun, 1: Coffee, 2: Moon };

interface CalendarSchedulerProps {
  onScheduleSelect: (data: { date: Date; frequency: string; slot: string }) => void;
  frequencies?: string[];
  timeSlots?: string[];
}

export function CalendarScheduler({ onScheduleSelect, frequencies: freqProp, timeSlots: slotProp }: CalendarSchedulerProps) {
  const frequencies = freqProp?.length ? freqProp : ["Once", "Daily", "Alternate Days", "Weekly", "Monthly"];
  const slotLabels  = slotProp?.length ? slotProp  : ["Morning (6 AM–8 AM)", "Day (10 AM–2 PM)", "Evening (5 PM–8 PM)"];

  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [frequency, setFrequency] = useState(frequencies[1] ?? frequencies[0]);
  const [slot, setSlot] = useState(slotLabels[0]);

  const slots = slotLabels.map((label, i) => ({ id: `slot-${i}`, label, icon: SLOT_ICONS[i] ?? Clock }));

  // Generate next 14 days for the quick calendar
  const nextDays = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i + 1));

  const handleConfirm = () => {
    onScheduleSelect({ date: selectedDate, frequency, slot });
  };

  return (
    <div className="space-y-6">
      {/* Date Selection (Horizontal Scroll) */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
          <CalendarIcon className="h-4 w-4 text-primary" /> Select Start Date
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
          {nextDays.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-water"
                    : "bg-card text-foreground hover:bg-accent border-border"
                }`}
              >
                <span className="text-xs font-medium opacity-80">{format(date, "EEE")}</span>
                <span className="text-xl font-bold">{format(date, "d")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Repeat Frequency</label>
        <div className="flex flex-wrap gap-2">
          {frequencies.map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                frequency === freq
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot */}
      <div>
        <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" /> Delivery Time Slot
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {slots.map((s) => (
            <button
              key={s.id}
              onClick={() => setSlot(s.label)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${
                slot === s.label
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-accent"
              }`}
            >
              <s.icon
                className={`h-6 w-6 ${slot === s.label ? "text-primary" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-medium text-center">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        variant="hero"
        className="w-full h-12 text-base mt-4 shadow-water"
      >
        Confirm Schedule
      </Button>
    </div>
  );
}
