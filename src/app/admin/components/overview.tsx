"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { name: "6am", total: Math.floor(Math.random() * 20) + 5 },
  { name: "7am", total: Math.floor(Math.random() * 30) + 10 },
  { name: "8am", total: Math.floor(Math.random() * 40) + 15 },
  { name: "9am", total: Math.floor(Math.random() * 35) + 10 },
  { name: "4pm", total: Math.floor(Math.random() * 45) + 20 },
  { name: "5pm", total: Math.floor(Math.random() * 60) + 25 },
  { name: "6pm", total: Math.floor(Math.random() * 70) + 30 },
  { name: "7pm", total: Math.floor(Math.random() * 65) + 25 },
  { name: "8pm", total: Math.floor(Math.random() * 50) + 20 },
  { name: "9pm", total: Math.floor(Math.random() * 30) + 10 },
]

export function Overview() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Peak Usage Hours</CardTitle>
        <CardDescription>
          An overview of member check-ins throughout the day.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
            <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
            />
            <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
             />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
