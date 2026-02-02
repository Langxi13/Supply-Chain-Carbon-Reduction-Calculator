// calculator.js - 增加对年度自定义类别的支持

/**
 * Calculate Annual Net Carbon Reduction
 * @param {Array} suppliers - List of suppliers
 * @param {Object} params - Calculation parameters (distances, storage)
 * @param {Object} config - Global configuration (categories, emission factors)
 */
function calculateAnnualNetReduction(suppliers, params = {}, config = {}) {
    if (!Array.isArray(suppliers) || suppliers.length === 0) {
        throw new Error('At least one supplier is required.');
    }

    const storageDays = params.storage_days || 30;
    const consumerDistance = params.consumer_distance || 1.0;
    const categories = config.categories || [];
    const factors = config.emissionFactors || {};

    // 1. Calculate Total Weight (Imported)
    const totalGoodsKg = suppliers.reduce((sum, s) => sum + s.weight_kg, 0);
    
    // --- NEW: Calculate Total Sold Weight (Based on Sales Rate) ---
    // 这一点很重要：进货量 != 售出量，我们要累加的是如果不按照sales_rate打折的实际量
    let totalSoldKg = 0;
    categories.forEach(cat => {
        const catTotal = totalGoodsKg * cat.proportion;
        const salesRate = (cat.sales_rate !== undefined) ? cat.sales_rate : 1.0;
        totalSoldKg += catTotal * salesRate;
    });

    // 2. Calculate Avoided Emissions (Existing)
    const avoidedEmissionKg = calculateAvoidedEmission(totalGoodsKg, categories);

    // 3. Calculate Additional Emissions
    const transportEmissionKg = calculateTransportEmission(suppliers, factors);
    const storageEmissionKg = calculateStorageEmission(totalGoodsKg, categories, storageDays, factors); // Updated to use category proportion
    const consumerEmissionKg = calculateConsumerEmission(totalGoodsKg, consumerDistance, factors);
    
    const additionalEmissionKg = transportEmissionKg + storageEmissionKg + consumerEmissionKg;

    return {
        avoidedEmission: avoidedEmissionKg / 1000,
        additionalEmission: additionalEmissionKg / 1000,
        netReduction: (avoidedEmissionKg - additionalEmissionKg) / 1000,
        breakdown: {
            transport: transportEmissionKg / 1000,
            storage: storageEmissionKg / 1000,
            consumer: consumerEmissionKg / 1000
        },
        totalGoodsKg: totalGoodsKg,
        totalSoldKg: totalSoldKg // <--- 新增返回字段
    };
}

/**
 * Calculate Multi-Year Net Reduction
 * Modification: Supports per-year overriding of BOTH emission factors AND product categories
 */
function calculateMultiYearNetReduction(yearlyData, globalConfig) {
    return yearlyData.map(yearData => {
        // 关键逻辑：构造当年的有效配置对象
        const effectiveConfig = {
            // 优先使用当年的自定义类别，否则使用全局类别
            categories: yearData.custom_categories || globalConfig.categories,
            // 优先使用当年的自定义因子，否则使用全局因子
            emissionFactors: yearData.custom_factors || globalConfig.emissionFactors
        };

        return calculateAnnualNetReduction(
            yearData.suppliers,
            {
                storage_days: yearData.storage_days,
                consumer_distance: yearData.consumer_distance
            },
            effectiveConfig // 传入混合后的配置
        );
    });
}

// --- Helper Functions ---

function calculateAvoidedEmission(totalKg, categories) {
    let total = 0;
    categories.forEach(cat => {
        // 修正逻辑：只有卖出去的部分 (sales_rate) 且原本会被填埋处理的部分 (waste_diversion_rate) 才算有效减排
        // 公式：Quantity * Sales_Rate * Diversion_Rate * Factor
        
        const qty = totalKg * cat.proportion;
        const salesRate = (cat.sales_rate !== undefined) ? cat.sales_rate : 1.0; // 默认 100%
        
        total += qty * salesRate * cat.waste_diversion_rate * cat.avoid_emission_factor;
    });
    return total;
}

function calculateTransportEmission(suppliers, factors) {
    let total = 0;
    suppliers.forEach(s => {
        const { weight_kg, is_collection, distances_km } = s;
        const { road, rail, ship, air } = distances_km;
        
        // Use factors from dynamic config
        if (road > 0) {
            // Note: Collection typically assumes a fixed truck emission or simpler calculation
            // Here assuming collection is heavy truck per km, else weighted per kg*km
            const roadFactor = is_collection ? 0.2 : factors.road_weighted; 
            total += is_collection ? road * roadFactor : weight_kg * road * roadFactor;
        }
        if (rail > 0) total += weight_kg * rail * factors.rail;
        if (ship > 0) total += weight_kg * ship * factors.ship;
        if (air > 0) total += weight_kg * air * factors.air;
    });
    return total;
}

function calculateStorageEmission(totalKg, categories, days, factors) {
    // Usually only food requires refrigerated storage, but let's assume all categories marked is_food=true use it?
    // Simplified: Just use total weight * factor * time
    // If you want to be specific: filter categories where is_food is true
    const foodProportion = categories.filter(c => c.is_food).reduce((sum, c) => sum + c.proportion, 0);
    const storedFoodKg = totalKg * foodProportion;
    
    return storedFoodKg * factors.storage_per_kg_per_month * (days / 30);
}

function calculateConsumerEmission(totalGoods, distance, factors) {
    return totalGoods * distance * factors.consumer;
}

if (typeof window !== 'undefined') {
    window.calculateAnnualNetReduction = calculateAnnualNetReduction;
    window.calculateMultiYearNetReduction = calculateMultiYearNetReduction;
}