import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';

export const InactivityTimer: React.FC = () => {
    const { logout, isAuthenticated } = useAuth();
    const { autoLogoutTimer, t } = useSettings();
    
    const [showWarning, setShowWarning] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(30);
    
    const lastActivityRef = useRef<number>(Date.now());
    const warningIntervalRef = useRef<any>(null);
    const mainTimerRef = useRef<any>(null);

    // If auto logout is disabled (0) or user is not logged in, do nothing
    if (autoLogoutTimer <= 0 || !isAuthenticated) {
        return null;
    }

    const logoutTimeInMs = autoLogoutTimer * 60 * 1000;
    // Show warning 30 seconds before logout (or 15 seconds if it's a 1-minute timer)
    const warningThresholdInMs = autoLogoutTimer === 1 ? 15000 : 30000; 

    const resetTimer = () => {
        lastActivityRef.current = Date.now();
        if (showWarning) {
            setShowWarning(false);
            setSecondsRemaining(30);
        }
    };

    const handleExtendSession = () => {
        resetTimer();
    };

    const handleImmediateLogout = () => {
        logout();
    };

    useEffect(() => {
        // Reset timers on mount/setting change
        resetTimer();

        // Standard user interaction events to track activity
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Main check running every second
        mainTimerRef.current = setInterval(() => {
            const idleTime = Date.now() - lastActivityRef.current;
            const remainingToLogout = logoutTimeInMs - idleTime;

            if (remainingToLogout <= 0) {
                // Time is up, log out
                clearInterval(mainTimerRef.current);
                if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
                logout();
            } else if (remainingToLogout <= warningThresholdInMs) {
                // Within warning threshold, show overlay modal if not already shown
                if (!showWarning) {
                    setShowWarning(true);
                    setSecondsRemaining(Math.ceil(remainingToLogout / 1000));
                }
            } else {
                // Still active, ensure warning is hidden
                if (showWarning) {
                    setShowWarning(false);
                }
            }
        }, 1000);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            if (mainTimerRef.current) clearInterval(mainTimerRef.current);
            if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
        };
    }, [autoLogoutTimer, logoutTimeInMs, warningThresholdInMs, isAuthenticated]);

    // Secondary countdown inside the warning modal
    useEffect(() => {
        if (showWarning) {
            warningIntervalRef.current = setInterval(() => {
                setSecondsRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(warningIntervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (warningIntervalRef.current) {
                clearInterval(warningIntervalRef.current);
            }
        }

        return () => {
            if (warningIntervalRef.current) {
                clearInterval(warningIntervalRef.current);
            }
        };
    }, [showWarning]);

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-150 animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 animate-pulse">
                        <Clock className="w-8 h-8" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {t('Inactivity Warning')}
                    </h3>
                    
                    <p className="text-slate-600 text-sm mb-6 px-2">
                        {t('You have been inactive for a while. For secure multi-user retail registries, you will be automatically logged out in:')}
                        <span className="block mt-3 text-3xl font-extrabold text-indigo-600 font-mono tracking-wider">
                            {secondsRemaining}s
                        </span>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleImmediateLogout}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-slate-200"
                        >
                            <LogOut className="w-4 h-4" />
                            {t('Log Out Now')}
                        </button>
                        
                        <button
                            onClick={handleExtendSession}
                            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-indigo-600/10 transition-all duration-200"
                        >
                            {t('Keep Me Logged In')}
                        </button>
                    </div>
                </div>
                
                <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    {t('Action required to maintain current cash register session')}
                </div>
            </div>
        </div>
    );
};
