import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { KitchenOrder } from '../contexts/DataContext';
import { X, Printer } from 'lucide-react';

interface KOTTicketProps {
  order: KitchenOrder;
  onClose: () => void;
}

// A KOT ticket is for the kitchen, not the customer - no prices, no
// business branding/logo, just what to cook and where. Deliberately a
// separate, narrower, monospace layout from InvoiceTemplate.tsx (which is
// the customer-facing receipt) since a kitchen printer is typically a
// different, narrower thermal printer than the POS receipt printer.
const KOTTicket: React.FC<KOTTicketProps> = ({ order, onClose }) => {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden print:shadow-none print:rounded-none print:max-w-full kot-ticket-print">
        <div className="flex justify-between items-center p-3 border-b border-slate-100 print:hidden">
          <span className="text-xs font-bold text-slate-500 uppercase">KOT Preview</span>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="p-1.5 hover:bg-slate-100 rounded-lg"><Printer className="w-4 h-4 text-slate-600" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-600" /></button>
          </div>
        </div>

        <div className="p-4 font-mono text-black">
          <div className="text-center mb-3">
            <p className="font-bold text-sm">{user?.businessName || 'Kitchen'}</p>
            <p className="text-[11px]">KITCHEN ORDER TICKET</p>
          </div>
          <div className="border-t border-b border-dashed border-black py-2 mb-2 text-[11px] space-y-0.5">
            <div className="flex justify-between"><span>Station:</span><span className="font-bold">{order.station}</span></div>
            <div className="flex justify-between">
              <span>{order.orderType === 'Dine-In' ? 'Table:' : 'Type:'}</span>
              <span className="font-bold">{order.orderType === 'Dine-In' ? (order.tableNumber || '—') : order.orderType}</span>
            </div>
            <div className="flex justify-between"><span>Time:</span><span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
            <div className="flex justify-between"><span>Ticket #:</span><span>{order.id.slice(-6).toUpperCase()}</span></div>
          </div>
          <div className="space-y-2 mb-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="font-bold">{item.qty}×</span>
                <span className="flex-1 px-2">{item.name}</span>
              </div>
            ))}
          </div>
          {order.notes && (
            <div className="border-t border-dashed border-black pt-2 text-[11px]">
              <span className="font-bold">Note: </span>{order.notes}
            </div>
          )}
          <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-[10px]">
            *** {order.status.toUpperCase()} ***
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body, html, #root { height: auto !important; overflow: visible !important; background: white; }
          body * { visibility: hidden; }
          .kot-ticket-print, .kot-ticket-print * { visibility: visible; }
          .kot-ticket-print {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default KOTTicket;
