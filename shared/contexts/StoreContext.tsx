
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthOptional } from './AuthContext';

export interface Store {
  id: string;
  name: string;
  location: string;
  phone?: string;
  isHeadOffice?: boolean;
}

interface StoreContextType {
  stores: Store[];
  activeStore: Store | 'HEAD_OFFICE';
  switchStore: (storeId: string) => void;
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (id: string, store: Partial<Omit<Store, 'id'>>) => void;
  deleteStore: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);


export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string>('HEAD_OFFICE');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user) {
      const savedStores = localStorage.getItem(`app_stores_${user.id}`);
      if (savedStores) {
        try {
          setStores(JSON.parse(savedStores));
        } catch (e) {
          console.error('Failed to parse stores', e);
          const defaultStore = { id: '1', name: user.businessName || 'Main Branch', location: user.location || 'Not Specified', phone: user.mobile, isHeadOffice: true };
          setStores([defaultStore]);
        }
      } else {
        // Create initial store based on signup info
        const defaultStore = { 
          id: '1', 
          name: user.businessName || 'Main Branch', 
          location: user.location || 'Not Specified', 
          phone: user.mobile,
          isHeadOffice: true 
        };
        setStores([defaultStore]);
      }

      const savedActive = localStorage.getItem(`app_active_store_${user.id}`);
      if (savedActive) {
          setActiveStoreId(savedActive);
      } else {
          setActiveStoreId('HEAD_OFFICE');
      }
      setIsInitialized(true);
    } else {
      setStores([]);
      setActiveStoreId('HEAD_OFFICE');
      setIsInitialized(false);
    }
  }, [user?.id]); // Re-run when user changes

  useEffect(() => {
    if (user && isInitialized) {
        localStorage.setItem(`app_stores_${user.id}`, JSON.stringify(stores));
    }
  }, [stores, user?.id, isInitialized]);

  const switchStore = (storeId: string) => {
      setActiveStoreId(storeId);
      if (user) {
        localStorage.setItem(`app_active_store_${user.id}`, storeId);
      }
  };

  const addStore = (storeData: Omit<Store, 'id'>) => {
    const newStore: Store = {
      ...storeData,
      id: Math.random().toString(36).substring(2, 9),
    };
    setStores(prev => [...prev, newStore]);
  };

  const updateStore = (id: string, storeData: Partial<Omit<Store, 'id'>>) => {
    setStores(prev => prev.map(store => store.id === id ? { ...store, ...storeData } : store));
  };

  const deleteStore = (id: string) => {
    setStores(prev => prev.filter(store => store.id !== id));
    if (activeStoreId === id) {
        switchStore('HEAD_OFFICE');
    }
  };

  const activeStore = activeStoreId === 'HEAD_OFFICE' 
    ? 'HEAD_OFFICE' 
    : stores.find(s => s.id === activeStoreId) || 'HEAD_OFFICE';

  return (
    <StoreContext.Provider value={{ stores, activeStore, switchStore, addStore, updateStore, deleteStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStores = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
};
