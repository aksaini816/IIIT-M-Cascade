import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface Point {
  month: string
  total: number
}

export const DonationTrendChart = ({ data }: { data: Point[] }) => (
  <div className="h-64 w-full">
    <ResponsiveContainer>
      <LineChart data={data} margin={{ left: 0, right: 18, top: 8, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={88} />
        <Tooltip formatter={(value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`} />
        <Line type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={3} dot={{ fill: '#0891b2' }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
)
