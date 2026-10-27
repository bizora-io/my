import React, { useState, useEffect } from 'react';
import { 
  Printer, Plus, Trash2, Settings, RefreshCw, Sliders, Check, 
  CheckCircle, Wifi, Bluetooth, Usb, Network, FileText, 
  PlusCircle, Info, HelpCircle, Edit3, Volume2, Save, Play, 
  FileCode, CheckCircle2, AlertTriangle, Eye, ArrowRight
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import soundService from '@shared/services/soundService';

interface PrinterProfile {
  id: string;
  name: string;
  connectionType: 'usb' | 'bluetooth' | 'network' | 'browser';
  model: string;
  paperWidth: '80mm' | '58mm' | 'A6_label';
  encoding: string;
  ipAddress?: string;
  port?: string;
  bluetoothName?: string;
  usbPort?: string;
  autoCutter: boolean;
  openCashDrawer: boolean;
  showHeaderLogo: boolean;
  showStoreDetails: boolean;
  showBarcode: boolean;
  feedLines: number;
  copies: number;
}

interface PrinterAssignment {
  receiptType: string;
  printerId: string;
}

export default function PrinterConfig() {
  const { t, currencySymbol } = useSettings();
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [assignments, setAssignments] = useState<PrinterAssignment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<{ name: string; type: string; address: string }[]>([]);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [testPrintSuccess, setTestPrintSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profiles' | 'assignments' | 'diagnostics'>('profiles');
  const [editingProfile, setEditingProfile] = useState<PrinterProfile | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Play a retro thermal printer hum/beep sound when test printing
  const playPrinterSound = () => {
    soundService.markUserInteracted();
    soundService.playPrinterBeep();
  };

  // Toast Helper
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  // Load configuration from LocalStorage on mount
  useEffect(() => {
    const savedPrinters = localStorage.getItem('bizora_printer_profiles');
    const savedAssignments = localStorage.getItem('bizora_printer_assignments');

    const defaultPrinters: PrinterProfile[] = [
      {
        id: 'p1',
        name: 'Main Cashier Receipt Printer',
        connectionType: 'usb',
        model: 'Epson TM-T88VI',
        paperWidth: '80mm',
        encoding: 'UTF-8',
        usbPort: 'COM3',
        autoCutter: true,
        openCashDrawer: true,
        showHeaderLogo: true,
        showStoreDetails: true,
        showBarcode: true,
        feedLines: 3,
        copies: 1
      },
      {
        id: 'p2',
        name: 'Kitchen Ticket Printer',
        connectionType: 'network',
        model: 'Generic ESC/POS Thermal',
        paperWidth: '80mm',
        encoding: 'CP437',
        ipAddress: '192.168.1.201',
        port: '9100',
        autoCutter: true,
        openCashDrawer: false,
        showHeaderLogo: false,
        showStoreDetails: false,
        showBarcode: false,
        feedLines: 4,
        copies: 1
      },
      {
        id: 'p3',
        name: 'Mobile Delivery Bluetooth Printer',
        connectionType: 'bluetooth',
        model: 'Xprinter XP-P300',
        paperWidth: '58mm',
        encoding: 'UTF-8',
        bluetoothName: 'XP-P300-Receipt-BT',
        autoCutter: false,
        openCashDrawer: false,
        showHeaderLogo: true,
        showStoreDetails: true,
        showBarcode: false,
        feedLines: 2,
        copies: 1
      }
    ];

    const defaultAssignments: PrinterAssignment[] = [
      { receiptType: 'Sales Receipt', printerId: 'p1' },
      { receiptType: 'Kitchen Order (KOT)', printerId: 'p2' },
      { receiptType: 'Customer Invoice Copy', printerId: 'p1' },
      { receiptType: 'Delivery Slip', printerId: 'p3' },
      { receiptType: 'Product Labels', printerId: 'p1' }
    ];

    if (savedPrinters) {
      try {
        const parsed = JSON.parse(savedPrinters);
        setPrinters(parsed);
        if (parsed.length > 0) {
          setSelectedPrinterId(parsed[0].id);
          setEditingProfile(parsed[0]);
        }
      } catch (e) {
        setPrinters(defaultPrinters);
        setSelectedPrinterId(defaultPrinters[0].id);
        setEditingProfile(defaultPrinters[0]);
      }
    } else {
      setPrinters(defaultPrinters);
      setSelectedPrinterId(defaultPrinters[0].id);
      setEditingProfile(defaultPrinters[0]);
      localStorage.setItem('bizora_printer_profiles', JSON.stringify(defaultPrinters));
    }

    if (savedAssignments) {
      try {
        setAssignments(JSON.parse(savedAssignments));
      } catch (e) {
        setAssignments(defaultAssignments);
      }
    } else {
      setAssignments(defaultAssignments);
      localStorage.setItem('bizora_printer_assignments', JSON.stringify(defaultAssignments));
    }
  }, []);

  // Save changes to state and LocalStorage
  const handleSavePrinters = (updatedPrinters: PrinterProfile[]) => {
    setPrinters(updatedPrinters);
    localStorage.setItem('bizora_printer_profiles', JSON.stringify(updatedPrinters));
  };

  const handleSaveAssignments = (updatedAssignments: PrinterAssignment[]) => {
    setAssignments(updatedAssignments);
    localStorage.setItem('bizora_printer_assignments', JSON.stringify(updatedAssignments));
  };

  // Profile Field Change
  const handleFieldChange = (field: keyof PrinterProfile, value: any) => {
    if (!editingProfile) return;
    const updated = { ...editingProfile, [field]: value };
    setEditingProfile(updated);

    // Sync back to general printers list
    const updatedList = printers.map(p => p.id === editingProfile.id ? updated : p);
    handleSavePrinters(updatedList);
  };

  // Add New Printer Profile
  const handleAddPrinter = () => {
    const newId = `p_custom_${Date.now()}`;
    const newPrinter: PrinterProfile = {
      id: newId,
      name: `New Thermal Printer ${printers.length + 1}`,
      connectionType: 'usb',
      model: 'Generic ESC/POS Thermal',
      paperWidth: '80mm',
      encoding: 'UTF-8',
      usbPort: 'COM1',
      autoCutter: true,
      openCashDrawer: false,
      showHeaderLogo: true,
      showStoreDetails: true,
      showBarcode: true,
      feedLines: 3,
      copies: 1
    };

    const newList = [...printers, newPrinter];
    handleSavePrinters(newList);
    setSelectedPrinterId(newId);
    setEditingProfile(newPrinter);
    triggerToast(`Added new printer profile: ${newPrinter.name}`, 'success');
  };

  // Delete Printer Profile
  const handleDeletePrinter = (id: string) => {
    if (printers.length <= 1) {
      triggerToast('You must keep at least one printer configuration profile.', 'error');
      return;
    }
    const filtered = printers.filter(p => p.id !== id);
    handleSavePrinters(filtered);

    // Remove assignments bound to this printer ID
    const updatedAssignments = assignments.map(a => a.printerId === id ? { ...a, printerId: filtered[0].id } : a);
    handleSaveAssignments(updatedAssignments);

    if (selectedPrinterId === id) {
      setSelectedPrinterId(filtered[0].id);
      setEditingProfile(filtered[0]);
    }
    triggerToast('Printer profile removed successfully', 'success');
  };

  // Scan for active printers simulation
  const handleScanDevices = () => {
    setIsScanning(true);
    setScannedDevices([]);
    setTimeout(() => {
      const found = [
        { name: 'Xprinter XP-N160I [BT]', type: 'bluetooth', address: '00:11:22:AA:BB:CC' },
        { name: 'Epson TM-T88VI [USB]', type: 'usb', address: 'VID_04B8&PID_0E15' },
        { name: 'Star Micronics TSP143 [LAN]', type: 'network', address: '192.168.1.185' },
        { name: 'Sunmi T2 Built-in [Internal]', type: 'usb', address: 'Internal-Sunmi-Bus' }
      ];
      setScannedDevices(found);
      setIsScanning(false);
      triggerToast('Scan finished! Found 4 active hardware interfaces.', 'success');
    }, 2000);
  };

  // Select Scanned Device
  const applyScannedDevice = (device: typeof scannedDevices[0]) => {
    if (!editingProfile) return;
    let connectionType: 'usb' | 'bluetooth' | 'network' | 'browser' = 'usb';
    if (device.type === 'bluetooth') connectionType = 'bluetooth';
    if (device.type === 'network') connectionType = 'network';

    const updated: PrinterProfile = {
      ...editingProfile,
      name: device.name.split(' [')[0],
      connectionType,
      model: device.name.includes('Epson') ? 'Epson TM-T88VI' : device.name.includes('Star') ? 'Star TSP143' : device.name.includes('Sunmi') ? 'Sunmi T2' : 'Generic ESC/POS Thermal',
      bluetoothName: connectionType === 'bluetooth' ? device.name : undefined,
      usbPort: connectionType === 'usb' ? (device.address.startsWith('VID_') ? 'USB001' : 'COM3') : undefined,
      ipAddress: connectionType === 'network' ? device.address : undefined,
    };

    setEditingProfile(updated);
    const updatedList = printers.map(p => p.id === editingProfile.id ? updated : p);
    handleSavePrinters(updatedList);
    triggerToast(`Configured with ${device.name}!`, 'success');
  };

  // Trigger test printing
  const handleTestPrint = () => {
    if (!editingProfile) return;
    setIsTestPrinting(true);
    setTestPrintSuccess(false);
    playPrinterSound();

    setTimeout(() => {
      setIsTestPrinting(false);
      setTestPrintSuccess(true);
      triggerToast(`Test page printed successfully on "${editingProfile.name}"!`, 'success');
      setTimeout(() => setTestPrintSuccess(false), 5000);
    }, 1800);
  };

  // Assign Printer to Receipt Type
  const handleAssignPrinter = (receiptType: string, printerId: string) => {
    const updated = assignments.map(a => a.receiptType === receiptType ? { ...a, printerId } : a);
    handleSaveAssignments(updated);
    triggerToast(`Assigned ${receiptType} to ${printers.find(p => p.id === printerId)?.name}`, 'success');
  };

  // Select printer for configuration editing
  const handleSelectPrinter = (id: string) => {
    setSelectedPrinterId(id);
    const prof = printers.find(p => p.id === id);
    if (prof) {
      setEditingProfile(prof);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="printer-config-root">
      {/* Toast Alert */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border animate-in fade-in slide-in-from-top-4 duration-300 ${
          showToast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-white' 
            : showToast.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 bg-white'
              : 'bg-indigo-50 border-indigo-100 text-indigo-600 bg-white'
        }`}>
          {showToast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {showToast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
          {showToast.type === 'info' && <Info className="w-5 h-5 text-indigo-500" />}
          <span className="text-sm font-semibold">{showToast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Printer className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('Printer Configuration')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your store's thermal printers, configure paper formats, scan physical interfaces, and route specific receipt/invoice dispatches.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="add-printer-btn"
            onClick={handleAddPrinter}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Printer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'profiles'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Printer Profiles ({printers.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'assignments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Routing & Assignments
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2.5 text-xs font-extrabold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'diagnostics'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Hardware Diagnostics
        </button>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Configuration Controls / Tables */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'profiles' && (
            <div className="space-y-6">
              {/* Profile Selector list */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Select Profile to Customize</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {printers.map((p) => {
                    const isSelected = p.id === selectedPrinterId;
                    return (
                      <div
                        key={p.id}
                        id={`printer-card-${p.id}`}
                        onClick={() => handleSelectPrinter(p.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900 shadow-sm' 
                            : 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-200/60 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <Printer className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 capitalize flex items-center gap-1.5">
                              {p.connectionType === 'usb' && <Usb className="w-3 h-3 text-emerald-500" />}
                              {p.connectionType === 'bluetooth' && <Bluetooth className="w-3 h-3 text-blue-500" />}
                              {p.connectionType === 'network' && <Network className="w-3 h-3 text-purple-500" />}
                              {p.connectionType === 'browser' && <Wifi className="w-3 h-3 text-slate-400" />}
                              <span>{p.connectionType} • {p.paperWidth}</span>
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePrinter(p.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editing Card fields */}
              {editingProfile && (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                        Profile Parameters: {editingProfile.name}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Printer Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Profile Name</label>
                      <input
                        type="text"
                        value={editingProfile.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Printer Model */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Printer Hardware Model</label>
                      <select
                        value={editingProfile.model}
                        onChange={(e) => handleFieldChange('model', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="Generic ESC/POS Thermal">Generic ESC/POS Thermal</option>
                        <option value="Epson TM-T88VI">Epson TM-T88VI</option>
                        <option value="Star TSP143">Star TSP143 / Micronics</option>
                        <option value="Xprinter XP-P300">Xprinter Pocket / Bluetooth</option>
                        <option value="Sunmi T2">Sunmi All-In-One Built-in</option>
                        <option value="Zebra GK420d">Zebra GK420d (Label Printer)</option>
                      </select>
                    </div>

                    {/* Connection Type */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Connection Interface</label>
                      <select
                        value={editingProfile.connectionType}
                        onChange={(e) => handleFieldChange('connectionType', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="usb">USB / COM Port Port</option>
                        <option value="bluetooth">Bluetooth (Wireless)</option>
                        <option value="network">Network IP (LAN / Wi-Fi)</option>
                        <option value="browser">Browser Default Driver</option>
                      </select>
                    </div>

                    {/* Paper Width */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Paper Format Width</label>
                      <select
                        value={editingProfile.paperWidth}
                        onChange={(e) => handleFieldChange('paperWidth', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="80mm">80mm (Standard POS Thermal)</option>
                        <option value="58mm">58mm (Compact Mobile Receipt)</option>
                        <option value="A6_label">A6 / 110mm Sticky Label Roll</option>
                      </select>
                    </div>

                    {/* Conditional Connection Details */}
                    {editingProfile.connectionType === 'network' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">IP Address</label>
                          <input
                            type="text"
                            placeholder="e.g. 192.168.1.100"
                            value={editingProfile.ipAddress || ''}
                            onChange={(e) => handleFieldChange('ipAddress', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Port (Default 9100)</label>
                          <input
                            type="text"
                            placeholder="9100"
                            value={editingProfile.port || ''}
                            onChange={(e) => handleFieldChange('port', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {editingProfile.connectionType === 'usb' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">USB Virtual COM Port</label>
                        <input
                          type="text"
                          placeholder="e.g. COM3 or LPT1"
                          value={editingProfile.usbPort || ''}
                          onChange={(e) => handleFieldChange('usbPort', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {editingProfile.connectionType === 'bluetooth' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Bluetooth Friendly Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Printer-BT-80"
                          value={editingProfile.bluetoothName || ''}
                          onChange={(e) => handleFieldChange('bluetoothName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Encoding */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Character Encoding</label>
                      <select
                        value={editingProfile.encoding}
                        onChange={(e) => handleFieldChange('encoding', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="UTF-8">UTF-8 Unicode (Global Support)</option>
                        <option value="CP437">CP437 Standard US OEM</option>
                        <option value="CP850">CP850 Multilingual Western Europe</option>
                        <option value="ISO-8859-1">ISO-8859-1 Latin 1</option>
                      </select>
                    </div>

                    {/* Copies */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Default Print Copies</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editingProfile.copies}
                        onChange={(e) => handleFieldChange('copies', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Bottom feed lines */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Bottom Feed Lines (Extra spacing)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={editingProfile.feedLines}
                        onChange={(e) => handleFieldChange('feedLines', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Hardware Toggles */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Hardware & Trigger Rules</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/10 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProfile.autoCutter}
                          onChange={(e) => handleFieldChange('autoCutter', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Auto-Cutter Signal</p>
                          <p className="text-[10px] text-slate-400">Sends GS V command after printing</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/10 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProfile.openCashDrawer}
                          onChange={(e) => handleFieldChange('openCashDrawer', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Trigger Cash Drawer</p>
                          <p className="text-[10px] text-slate-400">Sends 24V pulse to RJ11 kickout port</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Template Customizations */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Format & Content Overlays</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 p-2.5 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProfile.showHeaderLogo}
                          onChange={(e) => handleFieldChange('showHeaderLogo', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Include Logo</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProfile.showStoreDetails}
                          onChange={(e) => handleFieldChange('showStoreDetails', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Store Header Block</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 border border-slate-200/60 dark:border-slate-800 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProfile.showBarcode}
                          onChange={(e) => handleFieldChange('showBarcode', e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Print QR Code</span>
                      </label>
                    </div>
                  </div>

                  {/* Test print triggers */}
                  <div className="flex gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-5">
                    <button
                      id="test-print-btn"
                      onClick={handleTestPrint}
                      disabled={isTestPrinting}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                    >
                      {isTestPrinting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>Spooling ESC/POS packet...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                          <span>Dispatch Test Print Receipt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                  Router Workflow & Device Routing
                </h3>
                <p className="text-xs text-slate-400">
                  Select which connected printer device handles different transaction outputs automatically.
                </p>
              </div>

              <div className="space-y-3">
                {assignments.map((assign, index) => {
                  return (
                    <div
                      key={index}
                      className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl shadow-sm">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{assign.receiptType}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Dispatched automatically on event trigger</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Route To:</span>
                        <select
                          value={assign.printerId}
                          onChange={(e) => handleAssignPrinter(assign.receiptType, e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                        >
                          {printers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Auto-Routing Active</p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                    Whenever you complete a sale in the Sell screen or create a Kitchen Ticket, Bizora will check these assignments and send background packages directly to the specified printers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {/* Scan Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                    Interface Scanner
                  </h3>
                  <p className="text-xs text-slate-400">
                    Query physical serial hubs, wireless bluetooth devices, and internal IP subnets to locate POS printing hardware.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    id="scan-devices-btn"
                    onClick={handleScanDevices}
                    disabled={isScanning}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Polling Ports & Bluetooth...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Scan for Printer Devices</span>
                      </>
                    )}
                  </button>
                </div>

                {scannedDevices.length > 0 ? (
                  <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {scannedDevices.map((device, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/10 flex items-center justify-between hover:bg-indigo-50/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            {device.type === 'usb' && <Usb className="w-4 h-4 text-emerald-500" />}
                            {device.type === 'bluetooth' && <Bluetooth className="w-4 h-4 text-blue-500" />}
                            {device.type === 'network' && <Network className="w-4 h-4 text-purple-500" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">{device.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{device.address}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => applyScannedDevice(device)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold uppercase rounded-lg tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <span>Apply Config</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center text-center">
                    <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No active ports query active</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                      Press Scan above to initiate low-level polling on local device interfaces.
                    </p>
                  </div>
                )}
              </div>

              {/* Troubleshooting logs and commands */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                    Common ESC/POS Print Commands
                  </h3>
                  <p className="text-xs text-slate-400">
                    Standard low-level buffer commands sent to printing engines.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-950 text-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-indigo-400 text-[10px] uppercase">Initialize Printer</p>
                    <p className="text-[11px] text-slate-400">ESC @ (Hex: 1B 40)</p>
                    <p className="text-[10px] text-slate-500">Resets settings to defaults</p>
                  </div>

                  <div className="p-3 bg-slate-950 text-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-indigo-400 text-[10px] uppercase">Trigger Cash Drawer</p>
                    <p className="text-[11px] text-slate-400">ESC p 0 25 250</p>
                    <p className="text-[10px] text-slate-500">Sends pulse to drawer pin 2</p>
                  </div>

                  <div className="p-3 bg-slate-950 text-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-indigo-400 text-[10px] uppercase">Auto Cutter Cut</p>
                    <p className="text-[11px] text-slate-400">GS V 66 0 (Hex: 1D 56 42 00)</p>
                    <p className="text-[10px] text-slate-500">Executes feed and full cut</p>
                  </div>

                  <div className="p-3 bg-slate-950 text-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-indigo-400 text-[10px] uppercase">Bar Code Configuration</p>
                    <p className="text-[11px] text-slate-400">GS k 4 12 49 50...</p>
                    <p className="text-[10px] text-slate-500">Draws UPC-A standard codes</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: High fidelity Dynamic Receipt Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Live Receipt Format View</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold rounded">
                {editingProfile?.paperWidth || '80mm'} format
              </span>
            </div>

            {/* Simulated Thermoroller Receipt Roll */}
            {editingProfile && (
              <div className="relative mx-auto transition-all duration-300 max-w-full">
                {/* Roll Cap Shadow Overlay */}
                <div className="absolute -top-1 left-2 right-2 h-2 bg-slate-400/20 dark:bg-slate-950/40 blur-[1px] rounded-t-full" />
                
                {/* Paper Body */}
                <div 
                  className="bg-[#fcfbf7] text-slate-900 border border-slate-200/80 rounded-b-lg shadow-2xl p-6 font-mono text-xs overflow-hidden select-none transition-all duration-300 mx-auto border-t-[6px] border-t-slate-300 dark:border-t-slate-800"
                  style={{
                    width: editingProfile.paperWidth === '58mm' ? '280px' : editingProfile.paperWidth === 'A6_label' ? '380px' : '340px',
                    fontSize: editingProfile.paperWidth === '58mm' ? '10px' : '11px',
                    lineHeight: editingProfile.paperWidth === '58mm' ? '1.25' : '1.35',
                  }}
                >
                  {/* Spooling hum visual ripple overlay */}
                  {isTestPrinting && (
                    <div className="absolute inset-0 bg-indigo-600/5 animate-pulse flex items-center justify-center z-10 backdrop-blur-[0.5px]">
                      <div className="bg-slate-900/90 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-lg flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>PRINTING BUFFER...</span>
                      </div>
                    </div>
                  )}

                  {/* Test print success banner overlay */}
                  {testPrintSuccess && (
                    <div className="absolute inset-x-0 top-0 bg-emerald-500 text-white text-[10px] font-extrabold tracking-wider py-1 text-center shadow-md animate-in slide-in-from-top duration-300">
                      SUCCESSFULLY PRINTED !
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header Logo */}
                    {editingProfile.showHeaderLogo && (
                      <div className="flex flex-col items-center text-center space-y-1">
                        <div className="border-[1.5px] border-dashed border-slate-600 p-2 text-center rounded">
                          <span className="text-[10px] font-black tracking-widest text-slate-800">BIZORA</span>
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">- DIGITAL POINT OF SALE -</span>
                      </div>
                    )}

                    {/* Store details */}
                    {editingProfile.showStoreDetails && (
                      <div className="text-center text-slate-600 space-y-0.5">
                        <p className="font-extrabold text-slate-900 text-xs">Dhaka Super Mart LLC</p>
                        <p className="text-[9px]">Road 11, Banani, Dhaka-1213</p>
                        <p className="text-[9px]">Phone: +880-1712-345678</p>
                        <p className="text-[9px]">BIN: 001294819-0101</p>
                        <p className="text-slate-400 text-[8px]">------------------------------------------</p>
                      </div>
                    )}

                    {/* Transaction header */}
                    <div className="space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span>Invoice: #INV-2026-9481</span>
                        <span className="font-bold">SALE</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Date: 06-Jul-2026 11:24</span>
                        <span>Terminal: {editingProfile.usbPort || 'LAN'}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Cashier: Sifat Ahmed</span>
                        <span>Mode: Cash</span>
                      </div>
                      <p className="text-slate-400 text-[8px]">------------------------------------------</p>
                    </div>

                    {/* Items table */}
                    <div className="space-y-2">
                      <div className="flex justify-between font-extrabold text-slate-900 text-[9px] uppercase">
                        <span>Item Description</span>
                        <span>Qty x Price = Total</span>
                      </div>
                      <p className="text-slate-400 text-[8px] -mt-1">==========================================</p>
                      
                      <div className="space-y-1.5 text-slate-800">
                        <div>
                          <div className="flex justify-between font-bold">
                            <span>Pran Potato Crackers 25g</span>
                            <span>{currencySymbol} 45.00</span>
                          </div>
                          <div className="text-[9px] text-slate-500 ml-1">
                            3 pcs x {currencySymbol} 15.00
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-bold">
                            <span>Radhuni Turmeric Powder 200g</span>
                            <span>{currencySymbol} 160.00</span>
                          </div>
                          <div className="text-[9px] text-slate-500 ml-1">
                            2 pcs x {currencySymbol} 80.00
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-bold">
                            <span>Aarong Dairy Liquid Milk 1L</span>
                            <span>{currencySymbol} 180.00</span>
                          </div>
                          <div className="text-[9px] text-slate-500 ml-1">
                            2 pcs x {currencySymbol} 90.00
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[8px]">------------------------------------------</p>
                    </div>

                    {/* Summary Totals */}
                    <div className="space-y-1 text-slate-800 text-right">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{currencySymbol} 385.00</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>VAT (7.5%):</span>
                        <span>{currencySymbol} 28.87</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold text-[9px]">
                        <span>Promo Code (BIZORA5):</span>
                        <span>-{currencySymbol} 19.25</span>
                      </div>
                      <p className="text-slate-400 text-[8px] text-right">------------------</p>
                      <div className="flex justify-between font-black text-slate-900">
                        <span>NET TOTAL:</span>
                        <span>{currencySymbol} 394.62</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Cash Paid:</span>
                        <span>{currencySymbol} 500.00</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                        <span>Change Returned:</span>
                        <span>{currencySymbol} 105.38</span>
                      </div>
                      <p className="text-slate-400 text-[8px]">------------------------------------------</p>
                    </div>

                    {/* Receipt barcode or QR code */}
                    {editingProfile.showBarcode && (
                      <div className="flex flex-col items-center space-y-1.5 py-1">
                        {/* Simulated QR Code vector layout */}
                        <div className="w-16 h-16 bg-white border border-slate-300 p-1 rounded flex flex-col gap-0.5 justify-center items-center">
                          <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-full h-full ${
                                  (i % 3 === 0 || i % 7 === 0 || i === 0 || i === 3 || i === 12 || i === 15) 
                                    ? 'bg-slate-900' 
                                    : 'bg-transparent'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono">Invoice validation token #9481</span>
                      </div>
                    )}

                    {/* Footer messages */}
                    <div className="text-center text-slate-500 space-y-1">
                      <p className="text-[9px] font-bold">THANK YOU FOR SHOPPING WITH US!</p>
                      <p className="text-[8px]">Powered by Bizora • cloud-pos.net</p>
                    </div>

                    {/* Bottom feed lines representation */}
                    {Array.from({ length: editingProfile.feedLines }).map((_, idx) => (
                      <div key={idx} className="h-3 border-r border-dashed border-slate-300/40" />
                    ))}
                  </div>
                </div>

                {/* Jagged Tear Edge representation */}
                <div 
                  className="h-2 bg-slate-300 relative overflow-hidden -mt-[1px] rounded-b"
                  style={{
                    width: editingProfile.paperWidth === '58mm' ? '280px' : editingProfile.paperWidth === 'A6_label' ? '380px' : '340px',
                    clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)',
                    backgroundColor: '#dedcd3',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
