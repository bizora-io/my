import { useState, useEffect } from 'react';
import { CourierConfig, DomainConfig, PromoCode, ShopPolicies, Category } from '../../contexts/DataContext';
import { useStores } from '../../contexts/StoreContext';

export const useSettings = () => {
    const { activeStore } = useStores();
    const storeId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;
    
    const [courierSettings, setCourierSettings] = useState<CourierConfig[]>(() => {
        const saved = localStorage.getItem(`nexus_courierSettings_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_courierSettings_${storeId}`, JSON.stringify(courierSettings));
    }, [courierSettings, storeId]);

    const [domainSettings, setDomainSettings] = useState<DomainConfig>(() => {
        const saved = localStorage.getItem(`nexus_domainSettings_${storeId}`);
        return saved ? JSON.parse(saved) : { subdomain: '', customDomain: '', status: 'Not Connected' };
    });
    useEffect(() => {
        localStorage.setItem(`nexus_domainSettings_${storeId}`, JSON.stringify(domainSettings));
    }, [domainSettings, storeId]);

    const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => {
        const saved = localStorage.getItem(`nexus_promoCodes_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_promoCodes_${storeId}`, JSON.stringify(promoCodes));
    }, [promoCodes, storeId]);

    const [shopPolicies, setShopPolicies] = useState<ShopPolicies>(() => {
        const saved = localStorage.getItem(`nexus_shopPolicies_${storeId}`);
        return saved ? JSON.parse(saved) : { terms: '', refund: '', shipping: '' };
    });
    useEffect(() => {
        localStorage.setItem(`nexus_shopPolicies_${storeId}`, JSON.stringify(shopPolicies));
    }, [shopPolicies, storeId]);

    const [categories, setCategories] = useState<Category[]>(() => {
        const saved = localStorage.getItem(`nexus_categories_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_categories_${storeId}`, JSON.stringify(categories));
    }, [categories, storeId]);

    return {
        courierSettings,
        setCourierSettings,
        domainSettings,
        setDomainSettings,
        promoCodes,
        setPromoCodes,
        shopPolicies,
        setShopPolicies,
        categories,
        setCategories
    };
};
