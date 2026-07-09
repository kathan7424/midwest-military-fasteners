/**
 * File Name: DatePickerField.tsx
 * Description: Accessible date picker using React Aria + @internationalized/date.
 *   Styled to match the existing design system. Replaces native <input type="date">.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DateSegment,
  Dialog,
  Group,
  Heading,
  Label,
  Popover,
} from "react-aria-components";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import {
  FIELD_ERROR_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  REQUIRED_STAR_CLASS,
} from "@/components/shared_Ui/form-styles";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minValue?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

function safe_parse(str: string): DateValue | null {
  if (!str) return null;
  try {
    return parseDate(str);
  } catch {
    return null;
  }
}

export default function DatePickerField({
  label,
  value,
  onChange,
  minValue,
  required,
  error,
  className,
}: DatePickerFieldProps) {
  const parsedValue = safe_parse(value);
  const parsedMin = minValue ? (safe_parse(minValue) ?? undefined) : undefined;

  return (
    <DatePicker
      value={parsedValue}
      onChange={(date) => onChange(date ? date.toString() : "")}
      minValue={parsedMin}
      className={className}
    >
      <Label className={LABEL_CLASS}>
        {label}
        {required ? (
          <span className={REQUIRED_STAR_CLASS} aria-hidden="true"> *</span>
        ) : null}
      </Label>

      <Group
        className={`flex w-full items-center border bg-white px-4 py-3 outline-none transition-colors focus-within:border-blue ${
          error ? INPUT_ERROR_CLASS : "border-light-gray"
        }`}
      >
        <DateInput className="flex flex-1 items-center gap-0.5 text-link text-near-black">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 outline-none data-[placeholder]:text-dark-gray data-[focused]:bg-blue data-[focused]:text-white"
            />
          )}
        </DateInput>
        <Button className="ml-2 flex shrink-0 items-center justify-center text-dark-gray outline-none transition-colors hover:text-blue">
          <CalendarIcon className="size-4" aria-hidden="true" />
        </Button>
      </Group>

      {error ? (
        <p className={FIELD_ERROR_CLASS}>{error}</p>
      ) : null}

      <Popover className="z-50 mt-1 w-[280px] border border-light-gray bg-white shadow-lg outline-none">
        <Dialog className="p-3 outline-none">
          <Calendar className="outline-none">
            <header className="mb-3 flex items-center justify-between">
              <Button
                slot="previous"
                className="flex size-8 items-center justify-center text-dark-gray outline-none transition-colors hover:text-blue"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Heading className="text-sm font-semibold text-near-black" />
              <Button
                slot="next"
                className="flex size-8 items-center justify-center text-dark-gray outline-none transition-colors hover:text-blue"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </header>

            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-2 text-center text-xs font-semibold uppercase text-dark-gray">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="flex size-9 cursor-pointer items-center justify-center rounded text-sm text-near-black outline-none transition-colors hover:bg-off-white data-[disabled]:cursor-not-allowed data-[selected]:bg-blue data-[disabled]:opacity-40 data-[selected]:text-white data-[outside-month]:text-light-gray"
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </DatePicker>
  );
}
