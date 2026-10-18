import React from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { useSettings } from '../contexts/SettingsContext';

interface ChartProps {
    data: any[];
    dataKey?: string;
    categoryKey?: string;
    title?: string;
    color?: string;
    height?: number;
}

export const SalesTrendChart: React.FC<ChartProps> = ({ data, height = 300 }) => {
    const { currencySymbol, formatMoney } = useSettings();

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${currencySymbol}${value}`}
                    />
                    <Tooltip 
                        formatter={(value: number) => [formatMoney(value), 'Sales']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <Area type="monotone" dataKey="amount" stroke="#4f46e5" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const ExpenseBreakdownChart: React.FC<ChartProps> = ({ data, height = 300 }) => {
    const { formatMoney } = useSettings();
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatMoney(value)} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TopProductsChart: React.FC<ChartProps> = ({ data, height = 300 }) => {
    const { formatMoney } = useSettings();

    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} fontSize={11} />
                    <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        formatter={(value: number) => [formatMoney(value), 'Revenue']}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const CustomerGrowthChart: React.FC<ChartProps> = ({ data, height = 300 }) => {
    return (
        <div className="w-full h-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={height}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="newCustomers" name="New Customers" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="#82ca9d" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
