import React from 'react';
import {
  TrendingUp, DollarSign, Calendar, Download
} from 'lucide-react';

type Props = {
  forecastGrowth: any;
  forecastMonths: any;
  setForecastGrowth: any;
  setForecastMonths: any
};

export const AdminFinanceAnalyticsTab: React.FC<Props> = ({
  forecastGrowth,
  forecastMonths,
  setForecastGrowth,
  setForecastMonths,
}) => (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Finance & Revenue Analytics</h2>
                        <p className="text-slate-500 text-xs mb-6">Interactive revenue trend forecast calculator and accounts performance matrix.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Forecast Tool */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                <h3 className="font-bold text-slate-800 text-sm">Revenue Forecast Calculator</h3>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Growth Span (Months)</span>
                                        <span>{forecastMonths} Months</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="3" 
                                        max="12" 
                                        value={forecastMonths} 
                                        onChange={(e) => setForecastMonths(parseInt(e.target.value) || 6)}
                                        className="w-full accent-indigo-600"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-slate-600">
                                        <span>Estimated Monthly Churn / Growth Rate</span>
                                        <span>+{forecastGrowth}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="50" 
                                        value={forecastGrowth} 
                                        onChange={(e) => setForecastGrowth(parseInt(e.target.value) || 15)}
                                        className="w-full accent-indigo-600"
                                    />
                                </div>

                                <div className="border-t border-slate-200 pt-4 mt-2">
                                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                                        <span>Estimated Core MRR:</span>
                                        <span className="font-bold text-slate-800">45,000 BDT</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black text-slate-800">
                                        <span>Projected MRR in {forecastMonths} Mo:</span>
                                        <span className="text-indigo-600 font-extrabold">
                                            {Math.round(45000 * Math.pow(1 + (forecastGrowth / 100), forecastMonths)).toLocaleString()} BDT
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Grid */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 text-sm">Platform Financial Metrics</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="border border-slate-150 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Monthly Churn</p>
                                        <p className="text-xl font-black text-red-600 mt-1">1.2%</p>
                                    </div>
                                    <div className="border border-slate-150 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">LTV Per Tenant</p>
                                        <p className="text-xl font-black text-indigo-600 mt-1">42,000 BDT</p>
                                    </div>
                                    <div className="border border-slate-150 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">ARPU</p>
                                        <p className="text-xl font-black text-slate-800 mt-1">4,200 BDT</p>
                                    </div>
                                    <div className="border border-slate-150 p-4 rounded-xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">CAC Avg</p>
                                        <p className="text-xl font-black text-slate-800 mt-1">3,500 BDT</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
);

export default AdminFinanceAnalyticsTab;
