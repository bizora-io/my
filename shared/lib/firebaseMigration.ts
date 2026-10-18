import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Product, Entity, LedgerEntry } from '../contexts/DataContext';

export async function migrateDataToFirestore(userId: string, businessId: string) {
  if (!db) {
    console.warn("[firebaseMigration] skipped — client Firestore not available");
    return;
  }
  const firestore = db;

    if (!userId || !businessId) {
        console.error("No userId or businessId found for migration");
        return;
    }

    try {
        const batch = writeBatch(firestore);

        // Helper to add business_id to documents
        const addBusinessId = (data: any) => ({ ...data, business_id: businessId });

        // Products
        const productsData = localStorage.getItem(`nexus_products_${userId}`);
        if (productsData) {
            const products: Product[] = JSON.parse(productsData);
            products.forEach(product => {
                const productRef = doc(firestore, 'users', userId, 'businesses', businessId, 'products', product.id);
                batch.set(productRef, addBusinessId(product));
            });
        }

        // Ledger Entries (Transactions)
        const txsData = localStorage.getItem(`nexus_transactions_${userId}`);
        if (txsData) {
            const txs: LedgerEntry[] = JSON.parse(txsData);
            txs.forEach(tx => {
                const txRef = doc(firestore, 'users', userId, 'businesses', businessId, 'ledgerEntries', tx.id);
                batch.set(txRef, addBusinessId(tx));
            });
        }

        // Entities (Customers/Suppliers)
        const customersData = localStorage.getItem(`nexus_customers_${userId}`);
        if (customersData) {
            const customers: Entity[] = JSON.parse(customersData);
            customers.forEach(customer => {
                const customerRef = doc(firestore, 'users', userId, 'businesses', businessId, 'entities', customer.id);
                batch.set(customerRef, addBusinessId(customer));
            });
        }

        const suppliersData = localStorage.getItem(`nexus_suppliers_${userId}`);
        if (suppliersData) {
            const suppliers: Entity[] = JSON.parse(suppliersData);
            suppliers.forEach(supplier => {
                const supplierRef = doc(firestore, 'users', userId, 'businesses', businessId, 'entities', supplier.id);
                batch.set(supplierRef, addBusinessId(supplier));
            });
        }

        await batch.commit();
        console.log("Data migration complete for user:", userId, "business:", businessId);
    } catch (error) {
        console.warn("Firestore migration failed or was bypassed. Continuing with local storage:", error);
    }
}
