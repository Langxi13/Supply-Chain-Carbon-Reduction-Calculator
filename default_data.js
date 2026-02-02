/**
 * 默认数据源 - 来源于 categories_config.json 和 transport_routes.json
 * 使用 JS 常量而非 JSON 文件以避免本地运行时的 CORS 问题
 */

// 1. 标准化分类数据 (整合 Food 和 Non-Food 并重新计算全局权重)
// 假设: 食品占总业务 80% (0.8), 非食品占 20% (0.2)
const DEFAULT_CATEGORIES_CONFIG = [
    // --- Food (Total 0.8) ---
    // Added sales_rate: 1.0 (default)
    { name: "Snacks/Drinks", proportion: 0.32, diversion: 0.9, factor: 2.7, is_food: true, sales_rate: 1.0 }, 
    { name: "Dairy",         proportion: 0.24, diversion: 0.9, factor: 2.8, is_food: true, sales_rate: 0.95 }, // 假设短保质期稍微低一点
    { name: "Bakery",        proportion: 0.24, diversion: 0.9, factor: 2.5, is_food: true, sales_rate: 0.95 },
    
    // --- Non-Food (Total 0.2) ---
    { name: "Cosmetics",     proportion: 0.12, diversion: 0.9, factor: 3.5, is_food: false, sales_rate: 1.0 },
    { name: "Cleaning",      proportion: 0.08, diversion: 0.9, factor: 2.5, is_food: false, sales_rate: 1.0 }
];

// 2. 初始路线数据 (基准年)
const BASE_SUPPLIERS = [
    {
        name: "Hong Kong (Local)",
        weight: 36000,
        is_collection: true,
        distances: { road: 1000, rail: 0, ship: 0, air: 0 }
    },
    {
        name: "Singapore (Sea)",
        weight: 12000,
        is_collection: false,
        distances: { road: 27.6, rail: 0, ship: 2659, air: 0 }
    },
    {
        name: "Frankfurt (Sea+Road)",
        weight: 6000,
        is_collection: false,
        distances: { road: 38, rail: 0, ship: 18696, air: 0 }
    },
    {
        name: "Thailand (Sea)",
        weight: 6000,
        is_collection: false,
        distances: { road: 9.2, rail: 0, ship: 2785, air: 0 }
    }
];

/**
 * 生成模拟的多年数据
 * @param {number} startYear 
 * @param {number} numYears 
 */
function simulateMultiYearData(startYear, numYears) {
    const data = [];
    
    for (let i = 0; i < numYears; i++) {
        const year = startYear + i;
        const growthRate = 1 + (i * 0.12); //假设每年平均增长 12%
        
        // 深拷贝基准供应商
        let currentSuppliers = JSON.parse(JSON.stringify(BASE_SUPPLIERS));
        
        // 应用增长和随机扰动
        currentSuppliers.forEach(s => {
            // 每一个供应商的货量在增长趋势上由 +/- 5% 的波动
            const jitter = 0.95 + Math.random() * 0.1; 
            s.weight = Math.round(s.weight * growthRate * jitter);
            
            // 距离可能有微小变动 (路线优化或港口堵塞绕行)
            if(s.distances.ship > 0) s.distances.ship *= (0.98 + Math.random() * 0.04);
        });

        // --- 模拟多年发展中的业务多样性 ---
        
        // 第3年引入: 越南陆运线路 (Road)
        if (i >= 2) {
            currentSuppliers.push({
                name: "Vietnam (Road)",
                weight: 5000 * (1 + (i-2)*0.1),
                is_collection: false,
                distances: { road: 1500, rail: 0, ship: 0, air: 0 }
            });
        }

        // 第5年引入: 中国内陆如成都 (Rail - 中欧班列/高铁货运概念)
        if (i >= 4) {
            currentSuppliers.push({
                name: "Chengdu (Rail)",
                weight: 8000 * (1 + (i-4)*0.15),
                is_collection: false,
                distances: { road: 50, rail: 2000, ship: 0, air: 0 }
            });
        }

        data.push({
            year: year,
            suppliers: currentSuppliers,
            // 仓储时间随周转加快逐年减少，但不少于10天
            storage_days: Math.max(10, Math.round(30 - i * 1.5)), 
            // 随着门店扩张，消费者平均距离可能略微增加
            consumer_distance: 1.0 + (i * 0.05) 
        });
    }
    return data;
}

