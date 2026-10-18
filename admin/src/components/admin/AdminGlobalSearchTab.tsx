import React from 'react';
import {
  Search, Store, Users, Package
} from 'lucide-react';

type Props = {
  activeTab: any;
  globalSearchVal: any;
  setGlobalSearchVal: any;
  setSearchParams: any;
  setActiveTab?: (tab: string) => void;
  registeredUsers?: any[];
};

export const AdminGlobalSearchTab: React.FC<Props> = ({
  activeTab,
  globalSearchVal,
  setGlobalSearchVal,
  setSearchParams,
  setActiveTab = (_tab: string) => {},
  registeredUsers = [],
}) => (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Unified Global Search</h2>
                            <p className="text-slate-500 text-xs">Perform deep searches cross-entity across all platform businesses, customers, and staff in real-time.</p>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input 
                                type="text" 
                                value={globalSearchVal}
                                onChange={(e) => setGlobalSearchVal(e.target.value)}
                                placeholder="Search platform database by name, phone, ticket ID, or company..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-slate-50"
                            />
                        </div>

                        {globalSearchVal.trim() !== '' && (
                            <div className="space-y-3 pt-2">
                                <p className="text-[10px] font-black uppercase text-slate-400">Search Results</p>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {registeredUsers
                                        .filter((item: any) => 
                                            item.name.toLowerCase().includes(globalSearchVal.toLowerCase()) || 
                                            item.mobile?.includes(globalSearchVal) || 
                                            item.shopName?.toLowerCase().includes(globalSearchVal.toLowerCase())
                                        )
                                        .map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 transition text-slate-700">
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{item.name}</p>
                                                    <p className="text-[10px] text-slate-400">{item.shopName || 'No Shop'} • {item.mobile}</p>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setActiveTab('businesses');
                                                        setSearchParams({ tab: 'businesses', search: item.mobile });
                                                    }}
                                                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black text-slate-700 transition"
                                                >
                                                    View Business
                                                </button>
                                            </div>
                                        ))
                                    }
                                    {registeredUsers.filter((item: any) => 
                                        item.name.toLowerCase().includes(globalSearchVal.toLowerCase()) || 
                                        item.mobile?.includes(globalSearchVal) || 
                                        item.shopName?.toLowerCase().includes(globalSearchVal.toLowerCase())
                                    ).length === 0 && (
                                        <p className="text-xs text-slate-500 italic py-4 text-center">No matching entities found in global registry database.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
);

export default AdminGlobalSearchTab;
