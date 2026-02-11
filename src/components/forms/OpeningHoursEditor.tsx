import { useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface OpeningHoursData {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

const DEFAULT_HOURS: DayHours = {
  isOpen: true,
  openTime: "09:00",
  closeTime: "21:00",
};

interface OpeningHoursEditorProps {
  value: OpeningHoursData;
  onChange: (hours: OpeningHoursData) => void;
}

export const OpeningHoursEditor = ({ value, onChange }: OpeningHoursEditorProps) => {
  const updateDay = (day: keyof OpeningHoursData, updates: Partial<DayHours>) => {
    const previousDayState = value[day] || { isOpen: false, openTime: "09:00", closeTime: "21:00" };

    const newDayState = { ...previousDayState, ...updates };

    // If isOpen is true, ensure both openTime and closeTime have values.
    if (newDayState.isOpen) {
      newDayState.openTime = newDayState.openTime || "09:00";
      newDayState.closeTime = newDayState.closeTime || "21:00";
    }

    // If closing, clear the times to be consistent with Google's format.
    if (updates.isOpen === false) {
      newDayState.openTime = "";
      newDayState.closeTime = "";
    }
    
    onChange({
      ...value,
      [day]: newDayState
    });
  };

  const applyToAll = (sourceDay: keyof OpeningHoursData) => {
    const sourceHours = value[sourceDay];
    if (!sourceHours) return; // Don't apply if source is empty
    
    const newHours = { ...value };
    DAYS.forEach(({ key }) => {
      newHours[key] = { ...sourceHours };
    });
    onChange(newHours);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Opening Hours
        </Label>
      </div>
      
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => (
          <div
            key={key}
            className={cn(
              "grid grid-cols-[100px_auto_1fr_1fr_auto] gap-3 items-center p-2 rounded-lg",
              !value[key]?.isOpen && "bg-muted/50"
            )}
          >
            <span className="text-sm font-medium">{label}</span>
            
            <Switch
              checked={value[key]?.isOpen ?? false}
              onCheckedChange={(checked) => updateDay(key, { isOpen: checked })}
            />
            
            {value[key]?.isOpen ? (
              <>
                <Input
                  type="time"
                  value={value[key]?.openTime || "09:00"}
                  onChange={(e) => updateDay(key, { openTime: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  type="time"
                  value={value[key]?.closeTime || "21:00"}
                  onChange={(e) => updateDay(key, { closeTime: e.target.value })}
                  className="h-8 text-sm"
                />
                <div className="w-[90px]">
                  {key === "monday" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => applyToAll("monday")}
                      className="text-xs whitespace-nowrap"
                    >
                      Apply to all
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <span className="col-span-3 text-sm text-muted-foreground">Closed</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const getDefaultOpeningHours = (): OpeningHoursData => ({
  monday: { ...DEFAULT_HOURS },
  tuesday: { ...DEFAULT_HOURS },
  wednesday: { ...DEFAULT_HOURS },
  thursday: { ...DEFAULT_HOURS },
  friday: { ...DEFAULT_HOURS },
  saturday: { ...DEFAULT_HOURS },
  sunday: { ...DEFAULT_HOURS },
});

export const parseGoogleHours = (weekdayText?: string[]): OpeningHoursData => {
  const hours = getDefaultOpeningHours();
  
  if (!weekdayText) return hours;
  
  const dayMap: Record<string, keyof OpeningHoursData> = {
    "Monday": "monday",
    "Tuesday": "tuesday", 
    "Wednesday": "wednesday",
    "Thursday": "thursday",
    "Friday": "friday",
    "Saturday": "saturday",
    "Sunday": "sunday",
  };
  
  weekdayText.forEach(text => {
    // Parse strings like "Monday: 9:00 AM – 9:00 PM"
    const match = text.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, dayName, hoursStr] = match;
      const dayKey = dayMap[dayName];
      
      if (dayKey) {
        if (hoursStr.toLowerCase().includes("closed")) {
          hours[dayKey] = { isOpen: false, openTime: "", closeTime: "" };
        } else {
          const timeMatch = hoursStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (timeMatch) {
            const [, openHour, openMin, openAmPm, closeHour, closeMin, closeAmPm] = timeMatch;
            
            const convertTo24 = (hour: string, ampm?: string) => {
              let h = parseInt(hour);
              if (ampm?.toUpperCase() === "PM" && h !== 12) h += 12;
              if (ampm?.toUpperCase() === "AM" && h === 12) h = 0;
              return h.toString().padStart(2, "0");
            };
            
            hours[dayKey] = {
              isOpen: true,
              openTime: `${convertTo24(openHour, openAmPm)}:${openMin}`,
              closeTime: `${convertTo24(closeHour, closeAmPm)}:${closeMin}`,
            };
          }
        }
      }
    }
  });
  
  return hours;
};

export type { OpeningHoursData, DayHours };
