import { useState, useEffect } from 'react';
import { Product, RawMaterial, BillOfMaterial, ProductionBatch } from '../../contexts/DataContext';
import { useStores } from '../../contexts/StoreContext';

export const useInventory = () => {
    const { activeStore } = useStores();
    const storeId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;
    
    const [products, setProducts] = useState<Product[]>(() => {
        const saved = localStorage.getItem(`nexus_products_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_products_${storeId}`, JSON.stringify(products));
    }, [products, storeId]);

    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => {
        const saved = localStorage.getItem(`nexus_rawMaterials_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_rawMaterials_${storeId}`, JSON.stringify(rawMaterials));
    }, [rawMaterials, storeId]);

    const [boms, setBoms] = useState<BillOfMaterial[]>(() => {
        const saved = localStorage.getItem(`nexus_boms_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_boms_${storeId}`, JSON.stringify(boms));
    }, [boms, storeId]);

    const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(() => {
        const saved = localStorage.getItem(`nexus_productionBatches_${storeId}`);
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem(`nexus_productionBatches_${storeId}`, JSON.stringify(productionBatches));
    }, [productionBatches, storeId]);

    return {
        products,
        setProducts,
        rawMaterials,
        setRawMaterials,
        boms,
        setBoms,
        productionBatches,
        setProductionBatches
    };
};
