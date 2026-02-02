# 🌍 Supply Chain Carbon Reduction Calculator / 供应链碳减排计算器

![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Status](https://img.shields.io/badge/status-stable-success)

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English

### 📖 Introduction
This project is a web-based simulation tool designed to calculate and visualize the **Net Carbon Reduction** achieved by optimizing supply chains (e.g., rescuing "ugly" produce or optimizing logistics). 

It allows users to simulate multi-year scenarios, customize emission factors, manage suppliers, and visualize the environmental impact through dynamic charts. It is built with vanilla HTML/CSS/JS and uses **Chart.js** for rendering graphs.

### ✨ Key Features

1.  **Multi-Year Simulation**: Supports modeling carbon reduction over adjustable timelines (e.g., 10-year forecasts).
2.  **Granular Customization**:
    *   **Global Settings**: Define baseline product categories and emission factors.
    *   **Yearly Overrides**: customize sales rates, distances, and emission factors for specific years to simulate market changes or technological upgrades.
3.  **Comprehensive Calculation Model**:
    *   Quantifies **Avoided Emissions** (waste diversion).
    *   Quantifies **Additional Emissions** (Transport, Storage, Consumer travel).
    *   Calculates **Net Reduction**.
4.  **Rich Visualization**:
    *   **Line/Area Charts**: Trends over time.
    *   **Dynamic Stack Animation**: Visualizes the accumulation of saved carbon (gamified UI).
    *   **Sales Volume Analysis**: Tracks business growth vs. environmental impact.
5.  **Data Management**: Supports importing/exporting scenarios via JSON files.

### 🚀 How to Use

1.  **Clone or Download**: Download this repository to your local machine.
2.  **Run**: Open `index.html` in any modern web browser (Edge, Chrome, Firefox). No backend server is required.
3.  **Configure**:
    *   Input the Start Year and Number of Years.
    *   Configure Product Categories (Proportion, Sales Rate, Avoidance Factors).
    *   Set Logistics Factors (Road, Rail, Ship, Air emission rates).
4.  **Input Data**: Add suppliers and weights for each year. Expand specific years to override global settings if needed.
5.  **Calculate**: Click the "Calculate" button to view the dashboard and charts.

### 🧮 Core Algorithm

The core logic resides in `calculator.js`. The net reduction is calculated as:

$$ \text{Net Reduction} = \text{Avoided Emissions} - \text{Additional Emissions} $$

#### 1. Avoided Emissions
Emissions prevented by diverting waste from landfills.
$$ E_{avoided} = \sum (\text{Weight} \times \text{Proportion} \times \text{Sales Rate} \times \text{Diversion Rate} \times \text{Avoidance Factor}) $$

#### 2. Additional Emissions
Carbon cost incurred by the new supply chain process.
*   **Transport**: $\text{Distance} \times \text{Weight} \times \text{Mode Factor (Road/Rail/Ship/Air)}$
*   **Storage**: $\text{Weight} \times \text{Days} \times \text{Storage Factor}$
*   **Consumer**: $\text{Volume} \times \text{Distance} \times \text{Consumer Factor}$

### 📂 File Structure

*   `index.html`: Main user interface.
*   `style.css`: Styling, animations (Stack visualization), and responsive layout.
*   `calculator.js`: Core mathematical logic and formulas.
*   `visualization.js`: DOM manipulation, Chart.js integration, and interactivity logic.
*   `default_data.js`: Default constants and configuration settings.

---

<a name="chinese"></a>
## 🇨🇳 中文

### 📖 项目介绍
这是一个基于 Web 的供应链碳减排计算与模拟工具。它旨在量化并通过可视化手段展示优化供应链（例如拯救“丑果”或优化物流路径）所带来的**净碳减排量 (Net Carbon Reduction)**。

该工具支持多年度情景模拟，允许用户针对不同年份自定义各类参数，并通过动态图表直观地展示环境效益与商业增长的关系。项目采用原生 HTML/CSS/JS 开发，使用 **Chart.js** 进行图表渲染。

### ✨ 核心功能

1.  **多年度情景模拟**：支持生成并模拟长周期（如10年）的碳减排预测。
2.  **高度可定制化**：
    *   **全局设置**：定义基础商品类别、销售率及排放因子。
    *   **年度局部覆盖 (Override)**：针对特定年份单独修改物流参数、商品结构或排放因子，以模拟技术升级或市场变化。
3.  **精细化计算模型**：
    *   计算 **避免排放 (Avoided Emissions)**：基于废弃物转移率和销售率。
    *   计算 **额外排放 (Additional Emissions)**：包含运输、仓储及消费者端排放。
    *   得出 **净减排量**。
4.  **丰富的数据可视化**：
    *   **折线/面积图**：展示随时间变化的减排趋势。
    *   **动态堆叠动画 (Stack Animation)**：生动展示逐年累积的减碳成果。
    *   **销量分析图**：对比业务规模（销量）与环境影响。
5.  **数据管理**：支持一键导出/导入 JSON 配置文件，方便保存和分享模型参数。

### 🚀 使用方法

1.  **下载**：将本仓库克隆或下载到本地。
2.  **运行**：直接使用浏览器（Chrome, Edge, Firefox 等）打开 `index.html` 文件即可，无需后端服务器。
3.  **配置**：
    *   输入起始年份和模拟时长。
    *   配置商品类别参数（占比、销售率、避免排放因子等）。
    *   设置物流排放因子（公路、铁路、海运、空运）。
4.  **输入数据**：为每一年的添加供应商及进货量。如有需要，可展开特定年份的高级选项进行参数覆盖。
5.  **计算**：点击“Calculate Output”按钮查看计算结果及可视化仪表盘。

### 🧮 核心算法说明

核心逻辑位于 `calculator.js` 文件中。净减排量的计算公式如下：

$$ \text{净减排量} = \text{避免产生的排放} - \text{额外产生的排放} $$

#### 1. 避免产生的排放 (Avoided Emissions)
指因避免商品进入填埋场而减少的排放。
$$ E_{avoided} = \sum (\text{总重量} \times \text{类别占比} \times \text{销售率} \times \text{废物转移率} \times \text{避免排放因子}) $$

#### 2. 额外产生的排放 (Additional Emissions)
指建立新供应链所产生的碳成本。
*   **运输排放**：$\text{距离} \times \text{重量} \times \text{运输模式因子}$
*   **仓储排放**：$\text{库存重量} \times \text{存储天数} \times \text{仓储因子}$
*   **消费者排放**：$\text{商品量} \times \text{最后几公里距离} \times \text{私家车排放因子}$

### 📂 文件结构说明

*   `index.html`: 主页面结构。
*   `style.css`: 样式表，包含响应式布局和积木堆叠动画效果。
*   `calculator.js`: 后台计算逻辑，包含所有数学公式。
*   `visualization.js`: 页面交互逻辑、DOM 操作、Chart.js 图表配置及数据导入导出功能。
*   `default_data.js`: 默认的模拟数据和常量配置。

---