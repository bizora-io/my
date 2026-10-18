import React from 'react';
import { AuditLog } from '../AuditLog';

/** SaaS Admin — Audit & activity logs tab */
export const AdminAuditTab: React.FC = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
    <AuditLog />
  </div>
);

export default AdminAuditTab;
