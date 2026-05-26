"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-bold tracking-tight",
        nav: "flex items-center space-x-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 top-0 flex items-center justify-center transition-all z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 top-0 flex items-center justify-center transition-all z-10"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full mt-2",
        weekday:
          "text-muted-foreground rounded-md w-9 font-bold text-[0.7rem] uppercase tracking-wider flex items-center justify-center h-9",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-full w-full p-0 font-normal aria-selected:opacity-100 hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold rounded-md",
        today: "bg-accent/20 text-accent-foreground border border-accent/30 rounded-md",
        outside:
          "day-outside text-muted-foreground/30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/20 opacity-50 cursor-not-allowed",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
