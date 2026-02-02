// visualization.js - 修复版 (解决了 CreateYearSection 缺失 HTML 的问题)

let charts = {};

// Default Categories Data
const DEFAULT_CATEGORIES = [
    { name: "Snacks/Drinks", proportion: 0.4, diversion: 0.9, factor: 2.7, is_food: true },
    { name: "Dairy", proportion: 0.2, diversion: 0.9, factor: 2.8, is_food: true },
    { name: "Bakery", proportion: 0.2, diversion: 0.9, factor: 2.5, is_food: true },
    { name: "Non-Food", proportion: 0.2, diversion: 0.9, factor: 3.5, is_food: false }
];

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generate-years').addEventListener('click', () => generateYearInputs());
    document.getElementById('calculate-btn').addEventListener('click', calculateAndVisualize);
    document.getElementById('load-scenario-btn').addEventListener('click', loadDemoScenario);
    document.getElementById('import-file').addEventListener('change', handleFileImport);

    initCategories();
    
    // 默认加载
    if (typeof simulateMultiYearData === 'function') {
        const basicData = simulateMultiYearData(2025, 1);
        generateYearInputs(basicData);
    } else {
        generateYearInputs();
    }
});

// --- 1. 通用类别管理 ---

function getCategoryRowHtml(data) {
    return `
        <div class="category-row">
            <input type="text" class="cat-name" value="${data.name}" placeholder="Name">
            <input type="number" class="cat-prop" value="${data.proportion}" step="0.05" min="0" max="1" placeholder="Prop.">
            <input type="number" class="cat-div" value="${data.diversion}" step="0.05" min="0" max="1" placeholder="Div">
            <input type="number" class="cat-fact" value="${data.factor}" step="0.1" placeholder="Factor">
            <select class="cat-type">
                <option value="true" ${data.is_food ? 'selected' : ''}>Food</option>
                <option value="false" ${!data.is_food ? 'selected' : ''}>Non-Food</option>
            </select>
            <button class="remove-btn" onclick="this.parentElement.remove()">X</button>
        </div>
    `;
}

function initCategories() {
    const container = document.getElementById('category-container');
    container.innerHTML = `
        <div class="category-row category-header">
            <div>Name</div><div>Prop.</div><div>Div. Rate</div><div>Factor</div><div>Type</div><div></div>
        </div>
        <div id="global-cat-list"></div>
    `;
    
    const listContainer = document.getElementById('global-cat-list');
    const categoriesSource = (typeof DEFAULT_CATEGORIES_CONFIG !== 'undefined') ? DEFAULT_CATEGORIES_CONFIG : DEFAULT_CATEGORIES;
    
    categoriesSource.forEach(cat => {
        listContainer.insertAdjacentHTML('beforeend', getCategoryRowHtml(cat));
    });
}

window.addCategory = function() {
    const listContainer = document.getElementById('global-cat-list');
    const newCat = { name: "New", proportion: 0.1, diversion: 0.9, factor: 2.0, is_food: true };
    listContainer.insertAdjacentHTML('beforeend', getCategoryRowHtml(newCat));
}

function getCategoriesFromContainer(containerElement) {
    const categories = [];
    if (!containerElement) return [];
    
    containerElement.querySelectorAll('.category-row:not(.category-header)').forEach(row => {
        categories.push({
            name: row.querySelector('.cat-name').value,
            proportion: parseFloat(row.querySelector('.cat-prop').value) || 0,
            waste_diversion_rate: parseFloat(row.querySelector('.cat-div').value) || 0,
            avoid_emission_factor: parseFloat(row.querySelector('.cat-fact').value) || 0,
            is_food: row.querySelector('.cat-type').value === 'true'
        });
    });
    return categories;
}

window.addYearCategory = function(year) {
    const container = document.querySelector(`#year-cats-list-${year}`);
    const newCat = { name: "Yearly Special", proportion: 0.1, diversion: 0.9, factor: 2.0, is_food: true };
    container.insertAdjacentHTML('beforeend', getCategoryRowHtml(newCat));
}

// --- 2. UI 生成与交互 ---

function createYearSection(year, isFirst, data = null) {
    const section = document.createElement('div');
    section.className = 'year-data';
    // 默认折叠策略：如果是第1年，展开；如果是后续年份且是自动生成的（例如场景加载），也许可以默认折叠？
    // 目前保持默认全部展开，用户手动折叠
    
    section.dataset.year = year;
    
    const storageDays = data ? data.storage_days : 30;
    const consumerDist = data ? data.consumer_distance : 1.0;
    
    // Check Factor Override
    const hasCustomFactors = data && data.custom_factors;
    let defaultFactors = { road_weighted: 0.0002, rail: 0.00001, ship: 0.00005, air: 0.00075, storage_per_kg_per_month: 0.05, consumer: 0.002 };
    try { defaultFactors = getGlobalConfig().emissionFactors; } catch(e) {}
    const factors = hasCustomFactors ? data.custom_factors : defaultFactors;

    // Check Category Override
    const hasCustomCats = data && data.custom_categories && data.custom_categories.length > 0;
    const isMainOverride = hasCustomFactors || hasCustomCats;

    // 构造 HTML：分为 .year-header 和 .year-body
    section.innerHTML = `
        <div class="year-header" onclick="toggleYearSection(this)" title="Click to collapse/expand">
            <h3>📅 ${year} Data</h3>
            <span class="year-toggle-icon">▼</span>
        </div>
        
        <div class="year-body">
            <div class="suppliers-container" id="suppliers-${year}"></div>
            <button class="add-supplier-btn" onclick="addSupplier(${year})">➕ Add Supplier</button>
            
            <div class="other-params">
                <div class="transport-row">
                    <label>Storage Days:</label><input type="number" class="storage-days" value="${storageDays}" min="1" step="1">
                </div>
                <div class="transport-row">
                    <label>Consumer Distance (km):</label><input type="number" class="consumer-distance" value="${consumerDist.toFixed(1)}" min="0" step="0.1">
                </div>
            </div>

            <!-- 高级覆盖面板 -->
            <div style="margin-top: 15px; border-top: 1px solid #ddd; padding-top:10px;">
                <label class="override-toggle-label">
                    <input type="checkbox" class="override-checkbox" onchange="toggleLocalConfig(this)" ${isMainOverride ? 'checked' : ''}>
                    🛠️ Override Global Settings for ${year}
                </label>
                
                <div class="local-config-panel" style="display: ${isMainOverride ? 'block' : 'none'};">
                    <!-- 1. Emission Factors -->
                    <h4>⚠️ Emission Factors Override</h4>
                    <div class="input-grid" style="margin-bottom: 15px;">
                        <label>Road: <input type="number" class="lc-road" step="0.00001" value="${factors.road_weighted || 0}"></label>
                        <label>Rail: <input type="number" class="lc-rail" step="0.00001" value="${factors.rail || 0}"></label>
                        <label>Ship: <input type="number" class="lc-ship" step="0.00001" value="${factors.ship || 0}"></label>
                        <label>Air:  <input type="number" class="lc-air" step="0.00001" value="${factors.air || 0}"></label>
                        <label>Storage: <input type="number" class="lc-storage" step="0.01" value="${factors.storage_per_kg_per_month || 0}"></label>
                        <label>Consumer: <input type="number" class="lc-consumer" step="0.001" value="${factors.consumer || 0}"></label>
                    </div>

                    <!-- 2. Product Categories Override -->
                    <div class="category-override-section" style="border-top: 1px dashed #ccc; padding-top: 10px;">
                        <label class="override-toggle-label" style="font-size: 0.9em; color: #2c3e50;">
                            <input type="checkbox" class="cat-override-check" onchange="toggleYearlyCats(this, ${year})" ${hasCustomCats ? 'checked' : ''}>
                            📦 Customize Product Categories for ${year}
                        </label>
                        
                        <div id="year-cats-container-${year}" style="display: ${hasCustomCats ? 'block' : 'none'}; margin-top: 10px; background: white; padding: 10px; border-radius: 5px;">
                            <div class="category-row category-header" style="font-size: 0.8em;">
                                <div>Name</div><div>Prop.</div><div>Div.</div><div>Fact.</div><div>Type</div><div></div>
                            </div>
                            <div id="year-cats-list-${year}"></div>
                            <button class="secondary-btn" style="font-size: 0.8em;" onclick="addYearCategory(${year})">+ Add Year Category</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 填充供应商
    let suppliersHtml = '';
    if (data && data.suppliers) {
        data.suppliers.forEach((sup, idx) => suppliersHtml += createSupplierHtml(year, idx, sup));
    } else if (isFirst) {
        suppliersHtml += createSupplierHtml(year, 0, null);
    }
    section.querySelector(`#suppliers-${year}`).innerHTML = suppliersHtml;

    // 填充类别
    if (hasCustomCats) {
        const listContainer = section.querySelector(`#year-cats-list-${year}`);
        data.custom_categories.forEach(cat => {
            listContainer.insertAdjacentHTML('beforeend', getCategoryRowHtml(cat));
        });
    }

    return section;
}

// 切换面板显示
window.toggleLocalConfig = function(checkbox) {
    const panel = checkbox.closest('div').querySelector('.local-config-panel');
    panel.style.display = checkbox.checked ? 'block' : 'none';
    
    // 如果开启，回填全局值作为参考
    if (checkbox.checked) {
        try {
            const global = getGlobalConfig().emissionFactors;
            // 只有当值为0或空时才回填，避免覆盖用户已输入的值
            const roadInput = panel.querySelector('.lc-road');
            if (parseFloat(roadInput.value) === 0) roadInput.value = global.road_weighted;
            const railInput = panel.querySelector('.lc-rail');
            if (parseFloat(railInput.value) === 0) railInput.value = global.rail;
            const shipInput = panel.querySelector('.lc-ship');
            if (parseFloat(shipInput.value) === 0) shipInput.value = global.ship;
            const airInput = panel.querySelector('.lc-air');
            if (parseFloat(airInput.value) === 0) airInput.value = global.air;
            const storageInput = panel.querySelector('.lc-storage');
            if (parseFloat(storageInput.value) === 0) storageInput.value = global.storage_per_kg_per_month;
            const consumerInput = panel.querySelector('.lc-consumer');
            if (parseFloat(consumerInput.value) === 0) consumerInput.value = global.consumer;
        } catch(e) {}
    }
}

// 切换年度类别覆盖 (补全的 JS 逻辑)
window.toggleYearlyCats = function(checkbox, year) {
    const listContainer = document.querySelector(`#year-cats-list-${year}`);
    const wrapper = document.querySelector(`#year-cats-container-${year}`);
    
    if (checkbox.checked) {
        wrapper.style.display = 'block';
        // 如果列表是空的，自动复制当前的全局配置，作为用户的起步点
        if (listContainer.children.length === 0) {
            const globalCats = getCategoriesFromContainer(document.getElementById('global-cat-list'));
            globalCats.forEach(cat => {
                listContainer.insertAdjacentHTML('beforeend', getCategoryRowHtml(cat));
            });
        }
    } else {
        wrapper.style.display = 'none';
    }
}

// --- 3. 计算数据收集 ---

function getGlobalConfig() {
    const categories = getCategoriesFromContainer(document.getElementById('global-cat-list'));
    const emissionFactors = {
        road_weighted: parseFloat(document.getElementById('factor-road').value) || 0.0002,
        rail: parseFloat(document.getElementById('factor-rail').value) || 0,
        ship: parseFloat(document.getElementById('factor-ship').value) || 0,
        air: parseFloat(document.getElementById('factor-air').value) || 0,
        consumer: parseFloat(document.getElementById('factor-consumer').value) || 0,
        storage_per_kg_per_month: parseFloat(document.getElementById('factor-storage').value) || 0.05
    };
    return { categories, emissionFactors };
}


// --- 新增：手动切换逻辑 ---
let isInputsCollapsed = false;

window.toggleInputsManual = function() {
    // 反转当前状态
    toggleInputs(isInputsCollapsed); 
}

// 修改原有的 toggleInputs 以更新按钮文字
window.toggleInputs = function(show) {
    const container = document.getElementById('years-container');
    const controlBar = document.getElementById('edit-control-bar');
    const calcBtn = document.getElementById('calculate-btn');
    const toggleBtn = document.getElementById('manual-toggle-btn');
    
    if (show) {
        container.classList.remove('collapsed');
        controlBar.style.display = 'none';
        calcBtn.style.display = 'block';
        if(toggleBtn) toggleBtn.textContent = "🔼 Hide Inputs";
        isInputsCollapsed = false;
    } else {
        container.classList.add('collapsed');
        controlBar.style.display = 'flex';
        calcBtn.style.display = 'none';
        if(toggleBtn) toggleBtn.textContent = "🔽 Show Inputs";
        isInputsCollapsed = true;
    }
}

// --- 核心：提取数据抓取逻辑 (Extract Data Logic) ---
function gatherYearlyDataFromDOM() {
    const yearlyData = [];
    
    document.querySelectorAll('.year-data').forEach((yearDiv) => {
        const year = parseInt(yearDiv.dataset.year);
        const suppliers = [];
        
        // 抓取 Suppliers
        yearDiv.querySelectorAll('.supplier-item').forEach(item => {
             suppliers.push({ 
                weight_kg: parseFloat(item.querySelector('.weight').value) || 0, 
                is_collection: item.querySelector('.is-collection').checked, 
                distances_km: {
                    road: parseFloat(item.querySelector('.road').value) || 0,
                    rail: parseFloat(item.querySelector('.rail').value) || 0,
                    ship: parseFloat(item.querySelector('.ship').value) || 0,
                    air: parseFloat(item.querySelector('.air').value) || 0
                }
            });
        });

        // 抓取 Factors Override
        const isOverridden = yearDiv.querySelector('.override-checkbox').checked;
        let currentFactors = null; // null represents using global defaults
        if (isOverridden) {
            currentFactors = {
                road_weighted: parseFloat(yearDiv.querySelector('.lc-road').value) || 0,
                rail: parseFloat(yearDiv.querySelector('.lc-rail').value) || 0,
                ship: parseFloat(yearDiv.querySelector('.lc-ship').value) || 0,
                air: parseFloat(yearDiv.querySelector('.lc-air').value) || 0,
                storage_per_kg_per_month: parseFloat(yearDiv.querySelector('.lc-storage').value) || 0,
                consumer: parseFloat(yearDiv.querySelector('.lc-consumer').value) || 0
            };
        }

        // 抓取 Categories Override
        const catCheckbox = yearDiv.querySelector('.cat-override-check');
        const isCatOverridden = catCheckbox ? catCheckbox.checked : false;
        let currentCategories = null;
        if (isCatOverridden && isOverridden) { 
            const catContainer = yearDiv.querySelector(`#year-cats-list-${year}`);
            currentCategories = getCategoriesFromContainer(catContainer);
        }

        yearlyData.push({
            year: year,
            suppliers: suppliers,
            storage_days: parseFloat(yearDiv.querySelector('.storage-days').value) || 30,
            consumer_distance: parseFloat(yearDiv.querySelector('.consumer-distance').value) || 1.0,
            custom_factors: currentFactors,
            custom_categories: currentCategories 
        });
    });

    return yearlyData;
}

// --- 更新：导出功能 (Export JSON) ---
window.exportDataToJson = function() {
    try {
        const startYear = parseInt(document.getElementById('start-year').value);
        const numYears = parseInt(document.getElementById('num-years').value);
        
        // 1. 获取年度数据
        const yearsData = gatherYearlyDataFromDOM();
        
        // 2. 获取当前的全局配置 (方便完整恢复)
        const globalConfig = getGlobalConfig();

        // 3. 组装完整对象
        const exportObj = {
            export_date: new Date().toISOString(),
            start_year: startYear,
            num_years: numYears,
            global_config: globalConfig, // 包含 categories 和 emissionFactors
            years_data: yearsData
        };
        
        // 4. 下载逻辑
        const dataStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `carbon_data_${startYear}_${numYears}y.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("✅ Data Exported Successfully!");
        
    } catch(e) {
        alert("Export Error: " + e.message);
        console.error(e);
    }
}

// --- 更新：计算逻辑 (Simplified with gather func) ---
function calculateAndVisualize() {
    const numYears = parseInt(document.getElementById('num-years').value);
    const globalConfig = getGlobalConfig();

    try {
        // 使用新提取的函数抓取数据
        const yearlyData = gatherYearlyDataFromDOM();
        
        const results = calculateMultiYearNetReduction(yearlyData, globalConfig);
        displayResults(numYears, yearlyData.map(d => d.year), results);
        
        // Collapse inputs
        toggleInputs(false);

    } catch (error) {
        alert('Calculation Error: ' + error.message);
        console.error(error);
    }
}

// 另外，在 Generate reset Timeline 的时候，应该确保是展开状态
function generateYearInputs(prefillData = null) {
    const startYear = parseInt(document.getElementById('start-year').value);
    const numYears = parseInt(document.getElementById('num-years').value);
    const container = document.getElementById('years-container');
    container.innerHTML = '';
    
    // 确保重置时显示输入框
    window.toggleInputs(true); 
    
    for (let i = 0; i < numYears; i++) {
        const year = startYear + i;
        const yearData = prefillData ? prefillData[i] : null;
        container.appendChild(createYearSection(year, i === 0, yearData));
    }
}

function createSupplierHtml(year, index, data = null) {
    const name = data ? (data.name || `Supplier ${index+1}`) : `Supplier ${index + 1}`;
    const weight = data ? data.weight_kg || data.weight : (index === 0 ? 36000 : 10000); 
    const isColl = data ? data.is_collection : (index === 0);
    const dRoad = data ? (data.distances_km ? data.distances_km.road : data.distances.road) : (index === 0 ? 1000 : 0);
    const dRail = data ? (data.distances_km ? data.distances_km.rail : data.distances.rail) : 0;
    const dShip = data ? (data.distances_km ? data.distances_km.ship : data.distances.ship) : 0;
    const dAir  = data ? (data.distances_km ? data.distances_km.air : data.distances.air) : 0;

    return `
        <div class="supplier-item" data-index="${index}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <strong>${name}</strong>
                <button class="remove-btn" onclick="removeSupplier(this)">🗑️</button>
            </div>
            <div class="transport-row">
                <label>Weight (kg):</label>
                <input type="number" class="weight" value="${weight}" step="1000" min="0">
            </div>
            <div class="transport-modes">
                <div><label>Road:</label><input type="number" class="road" value="${Number(dRoad).toFixed(1)}" step="10" min="0"></div>
                <div><label>Rail:</label><input type="number" class="rail" value="${Number(dRail).toFixed(1)}" step="10" min="0"></div>
                <div><label>Ship:</label><input type="number" class="ship" value="${Number(dShip).toFixed(1)}" step="10" min="0"></div>
                <div><label>Air:</label><input type="number" class="air" value="${Number(dAir).toFixed(1)}" step="10" min="0"></div>
            </div>
            <label style="font-size:0.8em; color:#666;">
                <input type="checkbox" class="is-collection" ${isColl ? 'checked' : ''}>
                Collection(Road calculated by mileage only)
            </label>
        </div>
    `;
}

window.addSupplier = function(year) {
    const container = document.getElementById(`suppliers-${year}`);
    const index = container.querySelectorAll('.supplier-item').length;
    container.insertAdjacentHTML('beforeend', createSupplierHtml(year, index));
};

window.removeSupplier = function(button) {
    button.closest('.supplier-item').remove();
};

function loadDemoScenario() {
    document.getElementById('start-year').value = 2025;
    document.getElementById('num-years').value = 10;
    if (typeof simulateMultiYearData === 'function') {
        const demoData = simulateMultiYearData(2025, 10);
        generateYearInputs(demoData);
        calculateAndVisualize();
    } else {
        alert("Simulation module not loaded.");
    }
}

window.handleFileImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            document.getElementById('start-year').value = data.start_year || 2025;
            document.getElementById('num-years').value = data.num_years || (data.years_data ? data.years_data.length : 1);
            
            // Generate
            const container = document.getElementById('years-container');
            container.innerHTML = '';
            if (data.years_data) {
                data.years_data.forEach((yearData, index) => {
                    const year = (data.start_year || 2025) + index;
                    container.appendChild(createYearSection(year, index === 0, yearData));
                });
            }
            calculateAndVisualize();
            alert("✅ Import Successful!");
        } catch (err) {
            alert("❌ Invalid JSON File: " + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; 
}

window.downloadSampleJson = function() {
    // 构建一个包含所有高级特性的完整示例
    const sample = {
        "start_year": 2026,
        "num_years": 2,
        "years_data": [
            {
                "//_comment": "Year 1: 使用全局默认设置 (Use Global Settings)",
                "storage_days": 30,
                "consumer_distance": 1.5,
                "custom_factors": null, 
                "custom_categories": null,
                "suppliers": [
                    { 
                        "name": "Local Supplier (Example)", 
                        "weight_kg": 5000, 
                        "is_collection": true, 
                        "distances_km": { "road": 100, "rail": 0, "ship": 0, "air": 0 } 
                    }
                ]
            },
            {
                "//_comment": "Year 2: 演示覆盖所有参数 (Override Factors & Categories)",
                "storage_days": 25,
                "consumer_distance": 2.0,
                "custom_factors": { 
                    "road_weighted": 0.00015, 
                    "rail": 0.00001, 
                    "ship": 0.00005, 
                    "air": 0.00075, 
                    "storage_per_kg_per_month": 0.04, 
                    "consumer": 0.002 
                }, 
                "custom_categories": [
                    { "name": "Year 2 Special Snacks", "proportion": 0.5, "diversion": 0.95, "factor": 2.5, "is_food": true },
                    { "name": "Year 2 Misc", "proportion": 0.5, "diversion": 0.9, "factor": 3.0, "is_food": false }
                ],
                "suppliers": [
                    { 
                        "name": "Intl Supplier", 
                        "weight_kg": 10000, 
                        "is_collection": false, 
                        "distances_km": { "road": 50, "rail": 0, "ship": 5000, "air": 0 } 
                    }
                ]
            }
        ]
    };
    
    // 生成 Blob 进行下载
    const dataStr = JSON.stringify(sample, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = "carbon_calc_sample.json";
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Chart Functions (Simplified for brevity, assuming existing chart logic works)
function displayResults(numYears, years, results) {
    document.getElementById('results').style.display = 'block';
    if (numYears === 1) {
        document.getElementById('single-year-results').style.display = 'block';
        document.getElementById('multi-year-results').style.display = 'none';
        const r = results[0];
        document.getElementById('avoided-emission').textContent = r.avoidedEmission.toFixed(2);
        document.getElementById('additional-emission').textContent = r.additionalEmission.toFixed(2);
        document.getElementById('net-reduction').textContent = r.netReduction.toFixed(2);
        updateSingleYearCharts(r);
    } else {
        document.getElementById('single-year-results').style.display = 'none';
        document.getElementById('multi-year-results').style.display = 'block';
        updateMultiYearCharts(years, results);
        
        // --- NEW: Trigger Stack Animation ---
        initStackAnimation(years, results);
    }
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function updateSingleYearCharts(result) {
    // 销毁旧图表以防重绘冲突
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
    
    // 1. 柱状图 (现有代码)
    const barCtx = document.getElementById('emission-bar-chart');
    if (barCtx) {
        charts.bar = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Avoided', 'Additional', 'Net'],
                datasets: [{ 
                    label: 't CO2e', 
                    data: [result.avoidedEmission, result.additionalEmission, result.netReduction], 
                    backgroundColor: ['#4CAF50', '#F44336', '#2196F3'] 
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }

    // 2. 饼图 (补上的代码)
    const pieCtx = document.getElementById('additional-pie-chart');
    if(pieCtx) {
        // 检查数据是否全为0，避免饼图报错或显示难看
        const total = result.breakdown.transport + result.breakdown.storage + result.breakdown.consumer;
        
        charts.pie = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Transport', 'Storage', 'Consumer'],
                datasets: [{
                    data: [
                        result.breakdown.transport, 
                        result.breakdown.storage, 
                        result.breakdown.consumer
                    ],
                    backgroundColor: ['#FF9800', '#9C27B0', '#03A9F4'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: `Total: ${result.additionalEmission.toFixed(2)} t` }
                }
            }
        });
    }
}

function updateMultiYearCharts(years, results) {
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
    
    // 1. Net Reduction Line (Existing)
    const lineCtx = document.getElementById('net-reduction-line');
    if (lineCtx) {
        charts.line = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{ label: 'Net Reduction (t)', data: results.map(r => r.netReduction), borderColor: '#2196F3', tension: 0.1 }]
            }
        });
    }
    
    // 2. Cumulative Reduction Area (Existing)
    const areaCtx = document.getElementById('cumulative-area');
    if (areaCtx) {
        let acc = 0;
        const cumulative = results.map(r => { acc += r.netReduction; return acc; });
        charts.area = new Chart(areaCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{ label: 'Cumulative Reduction (t)', data: cumulative, fill: true, borderColor: '#4CAF50', backgroundColor: 'rgba(76, 175, 80, 0.2)' }]
            }
        });
    }

    // --- 3. NEW: Cumulative Sold Goods Area ---
    const salesCtx = document.getElementById('cumulative-sales-chart');
    if (salesCtx) {
        let salesAcc = 0;
        // 计算累加值，注意将 kg 转换为 Tonnes (/1000)
        const cumulativeSales = results.map(r => { 
            // 优先使用 totalSoldKg，如果旧代码没有这个字段则回退到 totalGoodsKg
            const val = (r.totalSoldKg !== undefined ? r.totalSoldKg : r.totalGoodsKg);
            salesAcc += val / 1000; 
            return salesAcc; 
        });

        charts.sales = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{ 
                    label: 'Cumulative Sold Volume (Tonnes)', 
                    data: cumulativeSales, 
                    fill: true, 
                    borderColor: '#FF9800', // 橙色
                    backgroundColor: 'rgba(255, 152, 0, 0.2)', // 浅橙色背景
                    tension: 0.3 // 稍微平滑一点的曲线
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Tonnes' }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Cumulative Sold: ${context.parsed.y.toFixed(0)} Tonnes`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// 新增：切换具体年份折叠状态的函数
window.toggleYearSection = function(headerElement) {
    const parent = headerElement.closest('.year-data');
    parent.classList.toggle('collapsed-year');
}

// 新增：堆叠动画逻辑
function initStackAnimation(years, results) {
    const container = document.getElementById('impact-stack-vis');
    container.innerHTML = ''; // Clear previous

    // 1. Calculate Total for scaling
    const totalReduction = results.reduce((sum, r) => sum + r.netReduction, 0);
    if (totalReduction <= 0) {
        container.innerHTML = '<p style="margin:auto; display:flex;">No net reduction achieved yet.</p>';
        return;
    }

    // 2. Generate Chips (Hidden initially)
    // 注意：我们要从下往上堆，第一年应该在最下面。CSS是 column-reverse，所以DOM顺序：第一年在最后面(底部)? 
    // 不，column-reverse div:first-child 在底部。
    // 所以 results[0] (Year 1) 应该是第一个被 append 的子元素。
    
    // 最大可用高度 (Leave some space for header)
    const MAX_HEIGHT_PERCENT = 90; 

    // 添加总数标签
    const label = document.createElement('div');
    label.className = 'stack-label-total';
    label.innerText = `Total: ${totalReduction.toFixed(1)} t`;
    container.appendChild(label); // This will be at the very top visually (absolute positioned)

    results.forEach((r, idx) => {
        const chip = document.createElement('div');
        chip.className = 'stack-chip';
        // 计算高度百分比，最少给 5% 以保证文字显示
        const heightPercent = (r.netReduction / totalReduction) * MAX_HEIGHT_PERCENT;
        const displayHeight = Math.max(heightPercent, 3); // Minimal 3% height
        
        chip.style.height = `${displayHeight}%`;
        
        // 只有高度足够才显示文字
        if (displayHeight > 5) {
            chip.innerText = `${years[idx]}`;
        }
        
        chip.dataset.tooltip = `${years[idx]}: ${r.netReduction.toFixed(1)} Tonnes`;
        
        container.appendChild(chip);
    });

    // 3. Observe for Scroll Trigger
    // 创建一个观察器，当元素进入屏幕 30% 时触发
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                playStackAnimation(container);
                observer.unobserve(entry.target); // Play only once
            }
        });
    }, { threshold: 0.3 });

    observer.observe(document.getElementById('impact-stack-container'));
}

function playStackAnimation(container) {
    const chips = container.querySelectorAll('.stack-chip');
    chips.forEach((chip, index) => {
        // 依次延迟显示
        setTimeout(() => {
            chip.classList.add('visible');
        }, index * 200); // 每200ms 掉下一块
    });
}