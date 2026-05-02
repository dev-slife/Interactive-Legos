// ----------------------------------- CONSTANTS ----------------------------------- //

const dataDir = "./data";



// ----------------------------------- DATA FUNCTIONS ----------------------------------- //

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                cur += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cur += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ",") {
                row.push(cur);
                cur = "";
            } else if (ch === "\n") {
                row.push(cur);
                if (row.some(v => v !== "")) {
                    rows.push(row);
                }
                row = [];
                cur = "";
            } else if (ch !== "\r") {
                cur += ch;
            }
        }
    }

    if (cur.length || row.length) {
        row.push(cur);
    }

    if (row.some(v => v !== "")) {
        rows.push(row);
    }

    const headers = rows.shift().map(h => h.trim());
    return rows.map(r => {
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = (r[i] ?? "").trim();
        });
        return obj;
    });
}


async function loadCSV(filePath) {
    const response = await fetch(filePath);
    const text = await response.text();
    return text;
}


async function readCSV(filePath) {
    const raw_text = await loadCSV(filePath)
    return parseCSV(raw_text);
}

function toMap(rows, key) {
    const map = new Map();
    for (const row of rows) {
        map.set(row[key], row);
    }
    return map;
}


async function buildArchitectureData(dataDir) {
    const sets = await readCSV(`${dataDir}/sets.csv`);
    const inventories = await readCSV(`${dataDir}/inv.csv`);
    const inventoryParts = await readCSV(`${dataDir}/inv_parts.csv`);
    const parts = await readCSV(`${dataDir}/parts.csv`);
    const partCategories = await readCSV(`${dataDir}/part_cat.csv`);
    const colors = await readCSV(`${dataDir}/colors.csv`);

    const partsByNum = toMap(parts, "part_num");
    const colorsById = toMap(colors, "id");

    const inventoryIdsBySetNum = new Map();
    for (const inv of inventories) {
        const setNum = inv.set_num;
        if (!inventoryIdsBySetNum.has(setNum)) inventoryIdsBySetNum.set(setNum, new Set());
        inventoryIdsBySetNum.get(setNum).add(inv.id);
    }

    const typeByCatId = new Map();
    partCategories.forEach(cat => {
        typeByCatId.set(cat.id, cat.name);
    });

    const architectureData = sets.map(set => {
        const invIds = inventoryIdsBySetNum.get(set.set_num) || new Set();
        
        const setParts = inventoryParts
            .filter(ip => invIds.has(ip.inventory_id))
            .map(ip => {
            const part = partsByNum.get(ip.part_num) || {};
            const color = colorsById.get(String(ip.color_id)) || {};
            const partCatId = part.part_cat_id;

            return {
                name: part.name || ip.part_num,
                color: color.name || "",
                count: Number(ip.quantity) || 0,
                type: typeByCatId.get(String(partCatId)),
                part_img: ip.img_url || part.part_img_url || ""
            };
        });

        return {
            set_num: set.set_num,
            set_name: set.name,
            set_img: set.set_img_url || `https://cdn.rebrickable.com/media/sets/${set.set_num}.jpg`,
            year: Number(set.year) || null,
            parts: setParts
        };
    });

    return architectureData;
}


function filteredData(data) {
    const setFilter = document.getElementById("setFilter");
    const colorFilter = document.getElementById("colorFilter");
    const partTypeFilter = document.getElementById("partTypeFilter");

    const setVal = setFilter.value;
    const colorVal = colorFilter.value;
    const typeVal = partTypeFilter.value;
    
    return data
        .filter(s => setVal === "all" || s.set_num === setVal)
        .map(s => ({
            ...s,
            parts: s.parts.filter(p =>
                (colorVal === "all" || p.color === colorVal) &&
                (typeVal === "all" || p.type === typeVal)
            )
    }));
}



// ----------------------------------- RENDER FUNCTIONS ----------------------------------- //

async function renderPage() {
    const data = await buildArchitectureData(dataDir);
    const allColors = [...new Set(data.flatMap(s => s.parts.map(p => p.color)))].sort();
    const allTypes = [...new Set(data.flatMap(s => s.parts.map(p => p.type)))].sort();

    let curSet = data[0].set_num;

    function preload() {
        const setFilter = document.getElementById("setFilter");
        const colorFilter = document.getElementById("colorFilter");
        const partTypeFilter = document.getElementById("partTypeFilter");
        
        data.forEach(s => {
            setFilter.insertAdjacentHTML("beforeend", `<option value="${s.set_num}">${s.set_name}</option>`);
        });
        allColors.forEach(c => colorFilter.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`));
        allTypes.forEach(t => partTypeFilter.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`));
        
        [setFilter, colorFilter, partTypeFilter].forEach(el => el.addEventListener("change", renderBarChart));
    }


    function renderBarChart() {
        const filtered = filteredData(data);
        const labels = filtered.map(s => s.set_name);
        const values = filtered.map(s => s.parts.reduce((sum, p) => sum + p.count, 0));
        
        Plotly.newPlot("barChart", [{
            type: "bar",
            x: labels,
            y: values,
            marker: {
                color: "#2563eb",
                line: {
                    color: "#1d4ed8",
                    width: 1
                }
            },
            hovertemplate: "<b>%{x}</b><br>Parts: %{y}<extra></extra>"
        }], {
            margin: {
                t: 20,
                l: 80,
                r: 20,
                b: 120
            },
            paper_bgcolor: "transparent",
            plot_bgcolor: "#fff",
            xaxis: {
                tickangle: -45,
                tickfont: { size: 11 },
                automargin: true,
                dtick: 1,
                tickmode: 'linear',
                title: "Sets"
            },
            yaxis: {
                automargin: true,
                title: "Part count"
            },
            showlegend: false
        }, { responsive: true });
    }


    function renderHeatmap() {
        const z = data.map(s =>
            allColors.map(color => s.parts
                .filter(p => p.color === color)
                .reduce((sum, p) => sum + p.count, 0))
            );
            
            Plotly.newPlot("heatmap", [{
                type: "heatmap",
                x: allColors,
                y: data.map(s => s.set_name),
                z,
                colorscale: [
                    [0, "#dceef9"],
                    [0.05, "#91c5e8"],
                    [0.1, "#4a90d6"],
                    [0.25, "#7c4dcc"],
                    [0.6, "#da4ec7"],
                    [1, "#e45757"]
                ],
                hovertemplate: "<b>%{y}</b><br>Color: %{x}<br>Count: %{z}<extra></extra>"
            }], {
                margin: {
                    t: 20,
                    l: 60,
                    r: 20,
                    b: 60
                },
                paper_bgcolor: "transparent",
                plot_bgcolor: "#fff",
                xaxis: {
                    showticklabels: false,
                    title: "Colors"
                },
                yaxis: {
                    showticklabels: false,
                    title: "Sets"
                }
            }, { responsive: true });
            
            const heatmap = document.getElementById("heatmap");
            heatmap.on("plotly_hover", ev => {
                const pt = ev.points[0];
                Plotly.relayout("heatmap", { shapes: [{
                    type: "rect",
                    xref: "x",
                    yref: "y",
                    x0: pt.x,
                    x1: pt.x,
                    y0: pt.y,
                    y1: pt.y,
                    line: {
                        color: "#111827",
                        width: 2
                    }
                }]
            });
        });
    }


    function renderSetList() {
        const setList = document.getElementById("setList");

        setList.innerHTML = data.map(s => `
            <div class="set-item ${s.set_num === curSet ? "active" : ""}" data-set="${s.set_num}">
            <strong>${s.set_name}</strong>
            <small>${s.set_num} • ${s.year} • ${s.parts.length} part rows</small>
            </div>`).join("");
            
        setList.querySelectorAll(".set-item").forEach(item => {
            item.addEventListener("click", () => {
                curSet = item.dataset.set;
                renderSetList();
                renderDetails();
            });
        });
    }


    function renderDetails() {
        const set = data.find(s => s.set_num === curSet) || data[0];
        const detailsPanel = document.querySelector(".details");
        
        detailsPanel.innerHTML = `
            <div class="set-detail-main">
            <div>
                <img src="${set.set_img}" alt="${set.set_name}" class="main-set-img">
                <h3>${set.set_name}</h3>
                <p class="muted">${set.set_num} • ${set.year}</p>
                <span class="badge">${set.parts.reduce((sum, p) => sum + p.count, 0)} total parts</span>
            </div>
            
            <div class="details-body">
                <table>
                <thead>
                    <tr>
                    <th>Part</th>
                    <th>Name</th>
                    <th>Color</th>
                    <th>Count</th>
                    </tr>
                </thead>
                <tbody>
                    ${set.parts.map(p => `
                    <tr>
                        <td><img src="${p.part_img}" class="part-row-img" alt="${p.name}"></td>
                        <td>${p.name}</td>
                        <td>${p.color}</td>
                        <td>${p.count}</td>
                    </tr>
                    `).join("")}
                </tbody>
                </table>
            </div>
            </div>
        `;
    }

    return { preload, renderBarChart, renderHeatmap, renderSetList, renderDetails };
}           


// ----------------------------------- LOAD PAGE ----------------------------------- //

document.addEventListener("DOMContentLoaded", async() => {
    const render = await renderPage();

    render.preload();
    render.renderBarChart();
    render.renderHeatmap();
    render.renderSetList();
    render.renderDetails();
});