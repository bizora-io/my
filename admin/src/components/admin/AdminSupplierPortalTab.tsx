import React from 'react';
import {
  Smartphone, Users, Search, CheckCircle, Package
} from 'lucide-react';

type Props = {
  setSupplierPortalAccounts: any;
  showToast: any;
  supplierPortalAccounts: any
};

export const AdminSupplierPortalTab: React.FC<Props> = ({
  setSupplierPortalAccounts,
  showToast,
  supplierPortalAccounts,
}) => (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Supplier Portal Management</h2>
                                <p className="text-slate-500 text-xs">Verify global supplier logins and control global purchase order flows</p>
                            </div>
                            <button 
                                onClick={() => showToast('Supplier invite emails/SMS dispatched', 'success')}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                            >
                                Dispatch Portal Invitations
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Supplier ID</th>
                                        <th className="px-6 py-3">Company</th>
                                        <th className="px-6 py-3">Auth Contact</th>
                                        <th className="px-6 py-3">Compliance</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {supplierPortalAccounts.map(supp => (
                                        <tr key={supp.id} className="hover:bg-slate-50 text-slate-700">
                                            <td className="px-6 py-4 font-mono font-bold text-indigo-600 text-xs">{supp.id}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{supp.name}</td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-xs">{supp.phone}</p>
                                                    <p className="text-[10px] text-slate-400">{supp.loginLogs}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${supp.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {supp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => {
                                                        const updated = supplierPortalAccounts.map(s => s.id === supp.id ? { ...s, status: s.status === 'Verified' ? 'Pending Verification' : 'Verified' } : s);
                                                        setSupplierPortalAccounts(updated);
                                                        showToast(`Compliance verified for ${supp.name}`, 'success');
                                                    }}
                                                    className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition"
                                                >
                                                    {supp.status === 'Verified' ? 'Revoke Verify' : 'Mark Verified'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
);

export default AdminSupplierPortalTab;
