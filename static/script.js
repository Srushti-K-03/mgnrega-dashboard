// ✅ FINAL — Fully corrected Dynamic MGNREGA Dashboard Script
let chart = null;

const districtSelect = document.getElementById("districtSelect");
const detectBtn = document.getElementById("detectBtn");
const status = document.getElementById("status");
const summary = document.getElementById("summary");
const insight = document.getElementById("insight");

// ✅ Helper: fetch from backend safely
async function fetchBackendData() {
  const formData = new FormData();
  formData.append("state", "Karnataka");
  const res = await fetch("/get_data", {

    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Backend request failed");
  return await res.json();
}

// ✅ Load data dynamically when page loads (populate dropdown)
window.addEventListener("load", async () => {
  try {
    status.textContent = "Loading district list...";
    const payload = await fetchBackendData();
    const records = payload.records || [];

    // Extract unique district names and sort
    const uniqueDistricts = [...new Set(records.map(r => (r.district_name || "").trim()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    // Populate dropdown
    districtSelect.innerHTML = "";
    uniqueDistricts.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      districtSelect.appendChild(opt);
    });

    // Use saved or default district
    const saved = localStorage.getItem("lastDistrict") || uniqueDistricts[0] || "";
    if (saved) {
      districtSelect.value = saved;
      fetchAndRender(saved);
    } else {
      status.textContent = "Select a district to view data.";
    }

    districtSelect.addEventListener("change", () => {
      const selected = districtSelect.value;
      localStorage.setItem("lastDistrict", selected);
      fetchAndRender(selected);
    });

    detectBtn.addEventListener("click", tryDetect);
  } catch (err) {
    console.error("Dropdown load failed:", err);
    status.textContent = "⚠️ Unable to load district list.";
    summary.innerHTML = `<div class="card">Unable to load district list.</div>`;
  }
});

// ✅ Fetch and display selected district data
async function fetchAndRender(district) {
  status.textContent = `Loading district data for ${district}...`;
  summary.innerHTML = "";
  insight.textContent = "";

  try {
    const payload = await fetchBackendData();
    if (!payload.records) throw new Error("No records found");

    const allDistricts = payload.records.filter(
      r => r.district_name.toLowerCase().includes(district.toLowerCase())
    );

    const currentYearData = allDistricts.filter(r => r.fin_year === "2024-2025");

    const monthOrder = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    currentYearData.sort((a,b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));

    const districtData = currentYearData[currentYearData.length - 1];
    if (!districtData) throw new Error("District not found in current year data");

    renderDistrict(district, districtData, currentYearData);
    status.textContent = "✅ Showing MGNREGA API data";
  } catch (e) {
    console.error("Error:", e);
    status.textContent = "⚠️ Failed to fetch data.";
    summary.innerHTML = `<div class="card">Unable to load data.</div>`;
  }
}

// ✅ Render stats + chart
function renderDistrict(district, data, allDistricts) {
  const jobs = parseInt(data.Total_Individuals_Worked || 0);
  const wages = parseFloat(data.Wages || 0).toFixed(2);
  const funds = parseFloat(data.Total_Exp || 0).toFixed(2);

  document.getElementById("jobs").textContent = jobs.toLocaleString();
  document.getElementById("wages").textContent = `₹${wages} Cr`;
  document.getElementById("funds").textContent = `₹${funds} Cr`;
  document.getElementById("dataMonth").textContent =
    `📅 Showing data for ${data.month}, ${data.fin_year}`;

  // ✅ Chart data
  const monthOrder = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
  const trendData = allDistricts.sort((a,b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month));
  const months = trendData.map(r => r.month);
  const fundsArr = trendData.map(r => parseFloat(r.Total_Exp || 0));

  const ctx = document.getElementById("trendChart").getContext("2d"); // ✅ You missed this earlier

  if (chart) chart.destroy(); // ✅ Prevents duplicate chart creation

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Funds Utilized (₹ Cr)",
        data: fundsArr,
        borderColor: "#1B5E20",
        backgroundColor: "rgba(76,175,80,0.25)",
        fill: true,
        borderWidth: 2.2,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#2E7D32",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      layout: { padding: 10 },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Funds (₹ Cr)", font: { size: 13 } },
          grid: { color: "rgba(0,0,0,0.05)" }
        },
        x: {
          title: { display: true, text: "Month", font: { size: 13 } },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 6,
            font: { size: 12 }
          },
          grid: { display: false }
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: { boxWidth: 20, font: { size: 13 } }
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.7)",
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 8,
          callbacks: {
            label: (ctx) => `₹${ctx.parsed.y.toLocaleString()} Cr`
          }
        }
      }
    }
  });
}

// ✅ Detect location (updates dropdown visibly; ensures option exists)
function tryDetect() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported.");
    return;
  }

  status.textContent = "📍 Detecting your location...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let detectedDistrict = "Tumkur";

      if (lat > 12 && lat < 14 && lon > 76 && lon < 78.5) detectedDistrict = "Bengaluru";
      else if (lat > 11 && lat < 13 && lon > 75 && lon < 78) detectedDistrict = "Mysuru";

      const options = Array.from(districtSelect.options).map(opt => opt.value);
      if (!options.includes(detectedDistrict)) {
        const newOpt = document.createElement("option");
        newOpt.value = detectedDistrict;
        newOpt.textContent = detectedDistrict;
        districtSelect.appendChild(newOpt);
      }

      districtSelect.value = detectedDistrict;
      localStorage.setItem("lastDistrict", detectedDistrict);
      status.textContent = `📍 Detected location: ${detectedDistrict}`;
      fetchAndRender(detectedDistrict);
    },
    (err) => {
      console.error("Location detection failed:", err);
      alert("Could not detect location. Please select manually.");
      status.textContent = "⚠️ Location detection failed.";
    }
  );
}
