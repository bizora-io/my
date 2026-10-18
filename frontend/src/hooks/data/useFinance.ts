import { useState, useEffect } from 'react';
import { LedgerEntry, FinancialAccount, ExpenseCategory } from '../../contexts/DataContext';
import { useStores } from '../../contexts/StoreContext';

export const useFinance = () => {
    const { activeStore } = useStores();
    const storeId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;
    
    const [transactions, setTransactions] = useState<LedgerEntry[]>(() => {
        const saved = localStorage.getItem(`nexus_transactions_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_transactions_${storeId}`, JSON.stringify(transactions));
    }, [transactions, storeId]);

    const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(() => {
        const saved = localStorage.getItem(`nexus_financialAccounts_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_financialAccounts_${storeId}`, JSON.stringify(financialAccounts));
    }, [financialAccounts, storeId]);

    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
        const saved = localStorage.getItem(`nexus_expenseCategories_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_expenseCategories_${storeId}`, JSON.stringify(expenseCategories));
    }, [expenseCategories, storeId]);

    return {
        transactions,
        setTransactions,
        financialAccounts,
        setFinancialAccounts,
        expenseCategories,
        setExpenseCategories
    };
};
