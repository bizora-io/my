import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useStores } from '../../contexts/StoreContext';
import { Briefcase, ChevronDown, CheckCircle, Store, MapPin } from 'lucide-react';

export const BusinessSwitcher: React.FC = () => {
    const { user, switchBusiness } = useAuth();
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Outside click & touch listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);
    
    if (!user?.businesses || user.businesses.length <= 1) return null;

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={t('Switch Business')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors border ${
                    isOpen 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
            >
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-bold whitespace-nowrap max-w-[70px] sm:max-w-[140px] truncate">
                    {user.businessName}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 py-2">{t('Switch Business')}</p>
                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                            {user.businesses.map(biz => (
                                <button
                                    key={biz.id}
                                    type="button"
                                    onClick={() => {
                                        switchBusiness(biz.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                                        biz.name === user.businessName
                                            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div className="truncate pr-2">
                                        <p className="truncate font-bold">{biz.name}</p>
                                        <p className="text-[10px] text-slate-400 font-normal">{biz.type || 'Retail'}</p>
                                    </div>
                                    {biz.name === user.businessName && (
                                        <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const StoreSwitcher: React.FC = () => {
    const { stores, activeStore, switchStore } = useStores();
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Outside click & touch listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);
    
    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={t('Switch Store')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors border ${
                    isOpen
                        ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                        : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                }`}
            >
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold whitespace-nowrap max-w-[80px] sm:max-w-[160px] truncate">
                    {activeStore === 'HEAD_OFFICE' ? t('Head Office (All)') : activeStore.name}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                        <button 
                            type="button"
                            onClick={() => {
                                switchStore('HEAD_OFFICE');
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                                activeStore === 'HEAD_OFFICE' 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div>
                                <p className="font-bold">{t('Head Office (All)')}</p>
                                <p className="text-[10px] text-slate-400 font-normal">{t('View consolidated data')}</p>
                            </div>
                            {activeStore === 'HEAD_OFFICE' && <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </button>
                        
                        {stores.length > 0 && <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>}
                        
                        <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                            {stores.map(store => (
                                <button
                                    key={store.id}
                                    type="button"
                                    onClick={() => {
                                        switchStore(store.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                                        activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id 
                                            ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' 
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div className="truncate pr-2">
                                        <p className="truncate font-bold">{store.name}</p>
                                        <p className="text-[10px] text-slate-400 font-normal truncate flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                                            {store.location}
                                        </p>
                                    </div>
                                    {activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id && (
                                        <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
