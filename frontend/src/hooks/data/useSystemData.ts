import { useState, useEffect } from 'react';
import { OnlineOrder } from '../../contexts/DataContext';
import { AppLog, Staff } from '../../types';
import { useStores } from '../../contexts/StoreContext';

export const useSystemData = () => {
    const { activeStore } = useStores();
    const storeId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;
    
    const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => {
        const saved = localStorage.getItem(`nexus_onlineOrders_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_onlineOrders_${storeId}`, JSON.stringify(onlineOrders));
    }, [onlineOrders, storeId]);

    const [appLogs, setAppLogs] = useState<AppLog[]>(() => {
        const saved = localStorage.getItem(`nexus_appLogs_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_appLogs_${storeId}`, JSON.stringify(appLogs));
    }, [appLogs, storeId]);

    const [staff, setStaff] = useState<Staff[]>(() => {
        const saved = localStorage.getItem(`nexus_staff_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_staff_${storeId}`, JSON.stringify(staff));
    }, [staff, storeId]);

    return {
        onlineOrders,
        setOnlineOrders,
        appLogs,
        setAppLogs,
        staff,
        setStaff
    };
};
