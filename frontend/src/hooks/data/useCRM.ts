import { useState, useEffect } from 'react';
import { Entity, CustomerGroup, SupportTicket, CustomerFeedback, MarketingCampaign } from '../../contexts/DataContext';
import { useStores } from '../../contexts/StoreContext';

export const useCRM = () => {
    const { activeStore } = useStores();
    const storeId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;
    
    const [customers, setCustomers] = useState<Entity[]>(() => {
        const saved = localStorage.getItem(`nexus_customers_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_customers_${storeId}`, JSON.stringify(customers));
    }, [customers, storeId]);

    const [suppliers, setSuppliers] = useState<Entity[]>(() => {
        const saved = localStorage.getItem(`nexus_suppliers_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_suppliers_${storeId}`, JSON.stringify(suppliers));
    }, [suppliers, storeId]);

    const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>(() => {
        const saved = localStorage.getItem(`nexus_customerGroups_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_customerGroups_${storeId}`, JSON.stringify(customerGroups));
    }, [customerGroups, storeId]);

    const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
        const saved = localStorage.getItem(`nexus_supportTickets_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_supportTickets_${storeId}`, JSON.stringify(supportTickets));
    }, [supportTickets, storeId]);

    const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>(() => {
        const saved = localStorage.getItem(`nexus_feedbacks_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_feedbacks_${storeId}`, JSON.stringify(feedbacks));
    }, [feedbacks, storeId]);

    const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>(() => {
        const saved = localStorage.getItem(`nexus_marketingCampaigns_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_marketingCampaigns_${storeId}`, JSON.stringify(marketingCampaigns));
    }, [marketingCampaigns, storeId]);

    return {
        customers,
        setCustomers,
        suppliers,
        setSuppliers,
        customerGroups,
        setCustomerGroups,
        supportTickets,
        setSupportTickets,
        feedbacks,
        setFeedbacks,
        marketingCampaigns,
        setMarketingCampaigns
    };
};
