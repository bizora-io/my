import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Hotel as HotelIcon, Plus, RefreshCw, BedDouble, UserCheck, LogOut, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface Room {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  capacity: number;
  ratePerNight: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE';
  currentGuestName?: string;
  currentReservationId?: string;
}

interface Reservation {
  id: string;
  guestName: string;
  guestPhone: string;
  roomId: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  ratePerNight: number;
  totalAmount: number;
  advancePaid: number;
  remainingAmount: number;
  status: 'BOOKED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
}

export const Hotel: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState<'rooms' | 'reservations'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [checkoutReservation, setCheckoutReservation] = useState<Reservation | null>(null);

  // New room form
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newRoomType, setNewRoomType] = useState('Deluxe');
  const [newFloor, setNewFloor] = useState(1);
  const [newCapacity, setNewCapacity] = useState(2);
  const [newRate, setNewRate] = useState(2500);

  // Booking form
  const [bookGuestName, setBookGuestName] = useState('');
  const [bookGuestPhone, setBookGuestPhone] = useState('');
  const [bookRoomId, setBookRoomId] = useState('');
  const [bookNights, setBookNights] = useState(1);
  const [bookAdvance, setBookAdvance] = useState(0);

  // Checkout form
  const [checkoutPaid, setCheckoutPaid] = useState(0);
  const [checkoutMethod, setCheckoutMethod] = useState('Cash');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, resRes] = await Promise.all([
        authFetch('/api/hotel/rooms'),
        authFetch('/api/hotel/reservations'),
      ]);
      if (rRes.ok) setRooms(await rRes.json());
      if (resRes.ok) setReservations(await resRes.json());
    } catch (e) {
      console.warn('Failed to load hotel data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNo) return;
    try {
      const res = await authFetch('/api/hotel/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNumber: newRoomNo,
          roomType: newRoomType,
          floor: newFloor,
          capacity: newCapacity,
          ratePerNight: newRate,
        }),
      });
      if (res.ok) {
        setShowRoomModal(false);
        setNewRoomNo('');
        loadData();
      }
    } catch (e) {
      console.warn('Create room failed', e);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookGuestName || !bookRoomId) return;
    const room = rooms.find((r) => r.id === bookRoomId);
    try {
      const res = await authFetch('/api/hotel/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: bookGuestName,
          guestPhone: bookGuestPhone,
          roomId: bookRoomId,
          roomNumber: room?.roomNumber,
          ratePerNight: room?.ratePerNight || 0,
          totalNights: bookNights,
          advancePaid: bookAdvance,
        }),
      });
      if (res.ok) {
        setShowBookModal(false);
        setBookGuestName('');
        setBookGuestPhone('');
        loadData();
      }
    } catch (e) {
      console.warn('Create booking failed', e);
    }
  };

  const handleCheckIn = async (resId: string) => {
    try {
      const res = await authFetch(`/api/hotel/reservations/${resId}/check-in`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Check-in failed', e);
    }
  };

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutReservation) return;
    try {
      const res = await authFetch(`/api/hotel/reservations/${checkoutReservation.id}/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: checkoutPaid,
          paymentMethod: checkoutMethod,
        }),
      });
      if (res.ok) {
        setCheckoutReservation(null);
        loadData();
      }
    } catch (e) {
      console.warn('Check-out failed', e);
    }
  };

  const handleCleanRoom = async (roomId: string) => {
    try {
      const res = await authFetch(`/api/hotel/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'AVAILABLE' }),
      });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Clean room failed', e);
    }
  };

  const availableCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const cleaningCount = rooms.filter((r) => r.status === 'CLEANING').length;

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <HotelIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            {t('Hotel & Hospitality Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Manage room availability, bookings, check-ins, folios, and automated room revenue postings.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRoomModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
          >
            <Plus className="w-4 h-4" />
            {t('Add Room')}
          </button>
          <button
            onClick={() => setShowBookModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('New Reservation')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Available Rooms')}
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {availableCount} <span className="text-sm font-normal text-slate-400">/ {rooms.length}</span>
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Occupied Rooms')}
          </span>
          <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {occupiedCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Cleaning / Turnover')}
          </span>
          <span className="text-2xl font-bold text-amber-500">
            {cleaningCount}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rooms'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          {t('Room Grid')} ({rooms.length})
        </button>
        <button
          onClick={() => setActiveTab('reservations')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'reservations'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t('Reservations')} ({reservations.length})
        </button>
      </div>

      {/* Tab: Rooms Grid */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`p-4 rounded-xl border transition-all ${
                room.status === 'AVAILABLE'
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : room.status === 'OCCUPIED'
                  ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {room.roomNumber}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {room.roomType} • Fl {room.floor}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    room.status === 'AVAILABLE'
                      ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100'
                      : room.status === 'OCCUPIED'
                      ? 'bg-rose-200 text-rose-800 dark:bg-rose-800 dark:text-rose-100'
                      : 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100'
                  }`}
                >
                  {room.status}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(room.ratePerNight)}/night
                </span>
                {room.status === 'CLEANING' && (
                  <button
                    onClick={() => handleCleanRoom(room.id)}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px]"
                  >
                    {t('Mark Ready')}
                  </button>
                )}
                {room.status === 'OCCUPIED' && room.currentGuestName && (
                  <span className="truncate max-w-[100px] text-slate-600 dark:text-slate-300">
                    {room.currentGuestName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Reservations */}
      {activeTab === 'reservations' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="p-4">{t('Guest Name')}</th>
                  <th className="p-4">{t('Room')}</th>
                  <th className="p-4">{t('Dates & Nights')}</th>
                  <th className="p-4">{t('Total Bill')}</th>
                  <th className="p-4">{t('Advance')}</th>
                  <th className="p-4">{t('Status')}</th>
                  <th className="p-4 text-right">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {reservations.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{res.guestName}</div>
                      {res.guestPhone && <div className="text-xs text-slate-400">{res.guestPhone}</div>}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      #{res.roomNumber}
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {res.totalNights} {t('night(s)')}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(res.totalAmount)}
                    </td>
                    <td className="p-4 text-emerald-600 font-semibold whitespace-nowrap">
                      {formatCurrency(res.advancePaid)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          res.status === 'CHECKED_IN'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                            : res.status === 'CHECKED_OUT'
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}
                      >
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      {res.status === 'BOOKED' && (
                        <button
                          onClick={() => handleCheckIn(res.id)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {t('Check-in')}
                        </button>
                      )}
                      {res.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => { setCheckoutReservation(res); setCheckoutPaid(res.remainingAmount); }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {t('Check-out')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('Add Hotel Room')}</h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Room No.')} *
                  </label>
                  <input
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    placeholder="e.g. 101, 204"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Room Type')}
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  >
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                    <option value="Standard">Standard</option>
                    <option value="Single">Single</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Floor')}</label>
                  <input
                    type="number"
                    value={newFloor}
                    onChange={(e) => setNewFloor(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Capacity')}</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Rate/Night')}</label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRoomModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold">
                  {t('Save Room')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('Book a Room')}</h2>
            <form onSubmit={handleCreateBooking} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Guest Name')} *</label>
                <input
                  value={bookGuestName}
                  onChange={(e) => setBookGuestName(e.target.value)}
                  placeholder="Guest full name"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Phone Number')}</label>
                <input
                  value={bookGuestPhone}
                  onChange={(e) => setBookGuestPhone(e.target.value)}
                  placeholder="+8801700000000"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Assign Room')} *</label>
                <select
                  value={bookRoomId}
                  onChange={(e) => setBookRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                >
                  <option value="">{t('Select an available room...')}</option>
                  {rooms.filter((r) => r.status === 'AVAILABLE').map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.roomNumber} - {r.roomType} ({formatCurrency(r.ratePerNight)}/night)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Nights')}</label>
                  <input
                    type="number"
                    min="1"
                    value={bookNights}
                    onChange={(e) => setBookNights(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Advance (Tk)')}</label>
                  <input
                    type="number"
                    min="0"
                    value={bookAdvance}
                    onChange={(e) => setBookAdvance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBookModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold">
                  {t('Confirm Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Guest Check-out')}: {checkoutReservation.guestName}
            </h2>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
              <div>Total Stay Bill: {formatCurrency(checkoutReservation.totalAmount)}</div>
              <div>Advance Received: {formatCurrency(checkoutReservation.advancePaid)}</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                Remaining Due: {formatCurrency(checkoutReservation.remainingAmount)}
              </div>
            </div>
            <form onSubmit={handleCheckOut} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Collect Paid Amount')} (Tk)
                </label>
                <input
                  type="number"
                  value={checkoutPaid}
                  onChange={(e) => setCheckoutPaid(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Payment Method')}</label>
                <select
                  value={checkoutMethod}
                  onChange={(e) => setCheckoutMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="bKash / Mobile Banking">bKash / Mobile Banking</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCheckoutReservation(null)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold">
                  {t('Process Folio & Check-out')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Hotel;

