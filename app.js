document.addEventListener("DOMContentLoaded", () => {
    const architectureData = [
        {
            set_num: "21060-1",
            set_name: "Himeji Castle",
            set_img: "https://cdn.rebrickable.com/media/sets/21060-1.jpg",
            year: 2023,
            parts: [
                { name: "Brick 2 x 4", color: "Light Bluish Gray", count: 120, type: "Brick", part_img: "" },
                { name: "Tile 1 x 2", color: "White", count: 48, type: "Tile", part_img: "" },
                { name: "Slope 45 2 x 2", color: "Tan", count: 22, type: "Slope", part_img: "" },
                { name: "Plate 1 x 2", color: "Dark Bluish Gray", count: 35, type: "Plate", part_img: "" }
            ]
        },
        {
            set_num: "21058-1",
            set_name: "Great Pyramid of Giza",
            set_img: "https://cdn.rebrickable.com/media/sets/21058-1.jpg",
            year: 2022,
            parts: [
                { name: "Brick 1 x 2", color: "Tan", count: 110, type: "Brick", part_img: "" },
                { name: "Plate 2 x 2", color: "Sand Yellow", count: 30, type: "Plate", part_img: "" },
                { name: "Tile 1 x 1", color: "Dark Tan", count: 28, type: "Tile" },
                { name: "Wedge Plate", color: "Light Bluish Gray", count: 16, type: "Plate", part_img: "" }
            ]
        },
        {
            set_num: "21061-1",
            set_name: "Notre-Dame de Paris",
            set_img: "https://cdn.rebrickable.com/media/sets/21061-1.jpg",
            year: 2024,
            parts: [
                { name: "Arch 1 x 6", color: "Dark Tan", count: 44, type: "Arch", part_img: "" },
                { name: "Plate 1 x 4", color: "Medium Nougat", count: 26, type: "Plate", part_img: "" },
                { name: "Tile 1 x 2", color: "White", count: 50, type: "Tile", part_img: "" },
                { name: "Brick 1 x 1", color: "Light Bluish Gray", count: 90, type: "Brick", part_img: "" }
            ]
        }
    ];
    
    const setFilter = document.getElementById("setFilter");
    const colorFilter = document.getElementById("colorFilter");
    const partTypeFilter = document.getElementById("partTypeFilter");
    const setList = document.getElementById("setList");
    const detailsTitle = document.getElementById("detailsTitle");
    const detailsMeta = document.getElementById("detailsMeta");
    const detailsBadge = document.getElementById("detailsBadge");
    const detailsTable = document.getElementById("detailsTable");
    
    const allColors = [...new Set(architectureData.flatMap(s => s.parts.map(p => p.color)))].sort();
    const allTypes = [...new Set(architectureData.flatMap(s => s.parts.map(p => p.type)))].sort();
    
    architectureData.forEach(s => {
        setFilter.insertAdjacentHTML("beforeend", `<option value="${s.set_num}">${s.set_name}</option>`);
    });
    allColors.forEach(c => colorFilter.insertAdjacentHTML("beforeend", `<option value="${c}">${c}</option>`));
    allTypes.forEach(t => partTypeFilter.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`));
    
    let selectedSet = architectureData[0].set_num;
    
    function filteredData() {
        const setVal = setFilter.value;
        const colorVal = colorFilter.value;
        const typeVal = partTypeFilter.value;
        
        return architectureData
        .filter(s => setVal === "all" || s.set_num === setVal)
        .map(s => ({
            ...s,
            parts: s.parts.filter(p =>
                (colorVal === "all" || p.color === colorVal) &&
                (typeVal === "all" || p.type === typeVal)
            )
        }));
    }
    
    function renderBarChart() {
        const data = filteredData();
        const labels = data.map(s => s.set_name);
        const values = data.map(s => s.parts.reduce((sum, p) => sum + p.count, 0));
        
        Plotly.newPlot("barChart", [{
            type: "bar",
            x: labels,
            y: values,
            marker: { color: "#2563eb", line: { color: "#1d4ed8", width: 1 } },
            hovertemplate: "<b>%{x}</b><br>Parts: %{y}<extra></extra>"
        }], {
            margin: { t: 20, l: 50, r: 20, b: 70 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "#fff",
            xaxis: { tickangle: -25, title: "Sets" },
            yaxis: { title: "Part count" },
            showlegend: false
        }, { responsive: true });
    }
    
    function renderHeatmap() {
        const z = architectureData.map(s =>
            allColors.map(color => s.parts
                .filter(p => p.color === color)
                .reduce((sum, p) => sum + p.count, 0))
            );
            
            Plotly.newPlot("heatmap", [{
                type: "heatmap",
                x: allColors,
                y: architectureData.map(s => s.set_name),
                z,
                colorscale: [
                    [0, "#dceef9"],
                    [0.25, "#91c5e8"],
                    [0.5, "#4a90d6"],
                    [0.75, "#7c4dcc"],
                    [1, "#e45757"]
                ],
                hovertemplate: "<b>%{y}</b><br>Color: %{x}<br>Count: %{z}<extra></extra>"
            }], {
                margin: { t: 20, l: 120, r: 20, b: 120 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "#fff",
                xaxis: { tickangle: -45, title: "Colors" },
                yaxis: { title: "Sets" }
            }, { responsive: true });
            
            const heatmap = document.getElementById("heatmap");
            heatmap.on("plotly_hover", ev => {
                const pt = ev.points[0];
                Plotly.relayout("heatmap", {
                    shapes: [
                        {
                            type: "rect",
                            xref: "x",
                            yref: "y",
                            x0: pt.x,
                            x1: pt.x,
                            y0: pt.y,
                            y1: pt.y,
                            line: { color: "#111827", width: 2 }
                        }
                    ]
                });
            });
        }
        
    function renderSetList() {
        setList.innerHTML = architectureData.map(s => `
            <div class="set-item ${s.set_num === selectedSet ? "active" : ""}" data-set="${s.set_num}">
            <strong>${s.set_name}</strong>
            <small>${s.set_num} • ${s.year} • ${s.parts.length} part rows</small>
            </div>`).join("");

        setList.querySelectorAll(".set-item").forEach(item => {
            item.addEventListener("click", () => {
                selectedSet = item.dataset.set;
                renderSetList();
                renderDetails();
            });
        });
    }

    function renderDetails() {
        const set = architectureData.find(s => s.set_num === selectedSet) || architectureData[0];
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
                
    [setFilter, colorFilter, partTypeFilter].forEach(el => el.addEventListener("change", renderBarChart));
    
    renderBarChart();
    renderHeatmap();
    renderSetList();
    renderDetails();
});