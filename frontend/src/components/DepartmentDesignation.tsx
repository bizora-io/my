import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, Department, Designation, WorkShift, Holiday } from '../contexts/DataContext';
import { Building2, Briefcase, Plus, Trash2, Clock, CalendarDays } from 'lucide-react';

const DepartmentDesignation: React.FC = () => {
  const { t } = useSettings();
  const {
    departments, addDepartment, deleteDepartment,
    designations, addDesignation, deleteDesignation,
    workShifts, addWorkShift, deleteWorkShift,
    holidays, addHoliday, deleteHoliday,
  } = useData();

  const [newDeptName, setNewDeptName] = useState('');
  const [newDesigName, setNewDesigName] = useState('');
  const [newDesigDept, setNewDesigDept] = useState('');

  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [shiftBreak, setShiftBreak] = useState('60');

  const [holName, setHolName] = useState('');
  const [holDate, setHolDate] = useState('');
  const [holRecurring, setHolRecurring] = useState(false);
  const [holPaid, setHolPaid] = useState(true);

  const handleAddDepartment = () => {
    if (!newDeptName.trim()) return;
    addDepartment({ id: `dept-${Date.now()}`, name: newDeptName.trim() });
    setNewDeptName('');
  };

  const handleAddDesignation = () => {
    if (!newDesigName.trim()) return;
    addDesignation({
      id: `desig-${Date.now()}`,
      name: newDesigName.trim(),
      departmentId: newDesigDept || undefined,
    });
    setNewDesigName('');
    setNewDesigDept('');
  };

  const handleAddShift = () => {
    if (!shiftName.trim() || !shiftStart || !shiftEnd) return;
    const shift: WorkShift = {
      id: `shift-${Date.now()}`,
      name: shiftName.trim(),
      startTime: shiftStart,
      endTime: shiftEnd,
      breakMinutes: parseInt(shiftBreak) || 0,
    };
    addWorkShift(shift);
    setShiftName('');
  };

  const handleAddHoliday = () => {
    if (!holName.trim() || !holDate) return;
    const holiday: Holiday = {
      id: `hol-${Date.now()}`,
      name: holName.trim(),
      date: holDate,
      recurring: holRecurring,
      paid: holPaid,
    };
    addHoliday(holiday);
    setHolName('');
    setHolDate('');
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">{t('HR Structure')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Departments, designations, work shifts, and company holidays used across HR and attendance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Departments')}</h3>
          </div>
          <div className="p-4 flex gap-2">
            <input
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
              placeholder="e.g. Sales, Warehouse, Accounts"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleAddDepartment} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {departments.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No departments yet.</p>
            ) : departments.map(dept => (
              <div key={dept.id} className="px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">{dept.name}</span>
                <button onClick={() => deleteDepartment(dept.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Designations */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">{t('Designations')}</h3>
          </div>
          <div className="p-4 space-y-2">
            <input
              value={newDesigName}
              onChange={e => setNewDesigName(e.target.value)}
              placeholder="e.g. Sales Executive, Cashier"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <select
                value={newDesigDept}
                onChange={e => setNewDesigDept(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button onClick={handleAddDesignation} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {designations.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No designations yet.</p>
            ) : designations.map(desig => (
              <div key={desig.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{desig.name}</span>
                  {desig.departmentId && (
                    <span className="ml-2 text-[11px] text-slate-400">
                      {departments.find(d => d.id === desig.departmentId)?.name}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteDesignation(desig.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Work Shifts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Work Shifts</h3>
          </div>
          <div className="p-4 space-y-2">
            <input
              value={shiftName}
              onChange={e => setShiftName(e.target.value)}
              placeholder="e.g. Morning, Night, Split"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Start</label>
                <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">End</label>
                <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Break (min)</label>
                <input type="number" value={shiftBreak} onChange={e => setShiftBreak(e.target.value)} className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm" min={0} />
              </div>
            </div>
            <button onClick={handleAddShift} className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Add Shift
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {workShifts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No shifts yet.</p>
            ) : workShifts.map(s => (
              <div key={s.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                  <p className="text-[11px] text-slate-400">
                    {s.startTime} – {s.endTime}
                    {s.breakMinutes ? ` · ${s.breakMinutes} min break` : ''}
                  </p>
                </div>
                <button onClick={() => deleteWorkShift(s.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Holidays */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Company Holidays</h3>
          </div>
          <div className="p-4 space-y-2">
            <input
              value={holName}
              onChange={e => setHolName(e.target.value)}
              placeholder="e.g. Independence Day, Eid"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              value={holDate}
              onChange={e => setHolDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={holRecurring} onChange={e => setHolRecurring(e.target.checked)} className="rounded border-slate-300" />
                Recurring yearly
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={holPaid} onChange={e => setHolPaid(e.target.checked)} className="rounded border-slate-300" />
                Paid holiday
              </label>
            </div>
            <button onClick={handleAddHoliday} className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" /> Add Holiday
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {holidays.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No holidays yet.</p>
            ) : [...holidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
              <div key={h.id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{h.name}</span>
                  <p className="text-[11px] text-slate-400">
                    {h.date}
                    {h.recurring ? ' · yearly' : ''}
                    {h.paid ? ' · paid' : ' · unpaid'}
                  </p>
                </div>
                <button onClick={() => deleteHoliday(h.id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDesignation;
