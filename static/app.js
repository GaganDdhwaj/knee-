const analyzeFileEl = document.getElementById("analyzeFile");
const analyzeBtnEl = document.getElementById("analyzeBtn");
const downloadPdfBtnEl = document.getElementById("downloadPdfBtn");
const reportBoxEl = document.getElementById("reportBox");
const predictedClassEl = document.getElementById("predictedClass");
const confidenceValEl = document.getElementById("confidenceVal");
const severityValEl = document.getElementById("severityVal");
const sourceValEl = document.getElementById("sourceVal");
const probChart3dEl = document.getElementById("probChart3d");
const probBarChartEl = document.getElementById("probBarChart");
const probPieChartEl = document.getElementById("probPieChart");
const confidenceFillEl = document.getElementById("confidenceFill");
const confidenceBadgeEl = document.getElementById("confidenceBadge");
const insightPanelEl = document.getElementById("insightPanel");

let latestAnalysis = null;

function safeSetText(el, value) {
  if (el) el.textContent = value;
}

function safeSetWidth(el, value) {
  if (el) el.style.width = value;
}

function confidenceBand(conf) {
  if (conf >= 85) return "Very High";
  if (conf >= 70) return "High";
  if (conf >= 50) return "Moderate";
  return "Low";
}

function buildImprovements(report, focusClass) {
  const pred = report.predicted_class;
  const conf = report.confidence;
  const cls = focusClass || pred;
  const lines = [];
  lines.push(`Focused Class Insight: ${cls}`);
  lines.push("");
  if (conf < 65) {
    lines.push("- Confidence is moderate or low. Improve image quality and reduce blur.");
    lines.push("- Retake the X-ray consistently and avoid crop artifacts.");
    lines.push("- Use clinical context and confirm with a qualified clinician.");
  } else {
    lines.push("- Confidence is relatively strong for this sample.");
    lines.push("- Validate with follow-up review and clinical assessment.");
  }
  lines.push("");
  if (cls === "Normal") {
    lines.push("Suggested next actions:");
    lines.push("- Maintain routine screening and bone-health habits.");
  } else if (cls === "Osteopenia") {
    lines.push("Suggested next actions:");
    lines.push("- Discuss monitoring, nutrition, and exercise planning.");
  } else if (cls === "Osteoporosis") {
    lines.push("Suggested next actions:");
    lines.push("- Prioritize specialist follow-up and fracture-risk review.");
  }
  lines.push("");
  lines.push("Note: AI output is a screening aid, not a diagnosis.");
  return lines.join("\n");
}

function render3dChart(report) {
  if (!probChart3dEl || !window.Plotly) return;
  const labels = report.class_probabilities.map((x) => x.class);
  const probs = report.class_probabilities.map((x) => x.probability);
  const trace = { x: labels, y: labels.map(() => "Probability"), z: probs, type: "bar3d", opacity: 0.95 };
  const layout = {
    title: "3D Class Probability Chart",
    margin: { l: 0, r: 0, b: 20, t: 40 },
    scene: {
      xaxis: { title: "Class" },
      yaxis: { title: "" },
      zaxis: { title: "Probability (%)", range: [0, 100] }
    }
  };

  try {
    Plotly.newPlot(probChart3dEl, [trace], layout, { displayModeBar: false, responsive: true });
  } catch (_err) {
    Plotly.newPlot(
      probChart3dEl,
      [{
        x: labels,
        y: labels.map(() => 1),
        z: probs,
        type: "scatter3d",
        mode: "markers+text",
        text: probs.map((p) => `${p}%`),
        marker: { size: 8, color: probs, colorscale: "Viridis" }
      }],
      layout,
      { displayModeBar: false, responsive: true }
    );
  }
}

function renderExtraCharts(report) {
  if (!window.Plotly) return;
  const labels = report.class_probabilities.map((x) => x.class);
  const probs = report.class_probabilities.map((x) => x.probability);
  const colors = ["#22c55e", "#f59e0b", "#ef4444"];

  if (probBarChartEl) {
    Plotly.newPlot(
      probBarChartEl,
      [{ x: labels, y: probs, type: "bar", marker: { color: colors } }],
      {
        title: "Class Probability (Bar)",
        margin: { l: 40, r: 10, b: 40, t: 40 },
        yaxis: { title: "Probability (%)", range: [0, 100] }
      },
      { displayModeBar: false, responsive: true }
    );
    probBarChartEl.on("plotly_click", (e) => {
      const cls = e?.points?.[0]?.x;
      safeSetText(insightPanelEl, buildImprovements(report, cls));
    });
  }

  if (probPieChartEl) {
    Plotly.newPlot(
      probPieChartEl,
      [{ labels, values: probs, type: "pie", textinfo: "label+percent", marker: { colors } }],
      { title: "Class Probability Share", margin: { l: 10, r: 10, b: 10, t: 40 } },
      { displayModeBar: false, responsive: true }
    );
    probPieChartEl.on("plotly_click", (e) => {
      const cls = e?.points?.[0]?.label;
      safeSetText(insightPanelEl, buildImprovements(report, cls));
    });
  }
}

function renderReport(data) {
  if (!data || !data.ok || !data.report) {
    safeSetText(reportBoxEl, JSON.stringify(data, null, 2));
    return;
  }

  latestAnalysis = data.report;
  safeSetText(predictedClassEl, data.report.predicted_class);
  safeSetText(confidenceValEl, `${data.report.confidence}%`);
  safeSetWidth(confidenceFillEl, `${Math.max(0, Math.min(100, data.report.confidence))}%`);
  safeSetText(confidenceBadgeEl, confidenceBand(data.report.confidence));
  safeSetText(severityValEl, data.report.severity_level);
  safeSetText(sourceValEl, data.report.model_info.inference_source);
  render3dChart(data.report);
  renderExtraCharts(data.report);
  safeSetText(insightPanelEl, buildImprovements(data.report));

  const lines = [
    "KNEE DISEASE IDENTIFIER REPORT",
    `Prediction: ${data.report.predicted_class}`,
    `Confidence: ${data.report.confidence}%`,
    `Severity: ${data.report.severity_level}`,
    `Inference Source: ${data.report.model_info.inference_source}`,
    `Analysis Time: ${data.report.analysis_time_ms || 0} ms`,
    `Views Used: ${data.report.views_used || 1}`,
    `Dataset Source: ${data.report.dataset_url || "-"}`,
    "",
    "Class Probabilities:"
  ];
  data.report.class_probabilities.forEach((p) => lines.push(`- ${p.class}: ${p.probability}%`));
  lines.push("");
  lines.push(`Note: ${data.report.note}`);
  if (data.report.warning) lines.push(`Warning: ${data.report.warning}`);
  safeSetText(reportBoxEl, lines.join("\n"));
}

async function downloadPdfReport() {
  if (!latestAnalysis) {
    safeSetText(reportBoxEl, "Run analysis first, then download PDF.");
    return;
  }
  const jsPDFLib = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFLib) {
    safeSetText(reportBoxEl, "PDF library not loaded.");
    return;
  }

  const doc = new jsPDFLib({ unit: "pt", format: "a4" });
  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Knee Disease Identifier Report", 40, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rows = [
    `Predicted Class: ${latestAnalysis.predicted_class}`,
    `Confidence: ${latestAnalysis.confidence}%`,
    `Severity: ${latestAnalysis.severity_level}`,
    `Inference Source: ${latestAnalysis.model_info.inference_source}`,
    `Analysis Time: ${latestAnalysis.analysis_time_ms || 0} ms`,
    `Views Used: ${latestAnalysis.views_used || 1}`,
    `Architecture: ${latestAnalysis.model_info.architecture}`,
    `Image Size: ${latestAnalysis.model_info.image_size}`,
    `Dataset Source: ${latestAnalysis.dataset_url || "-"}`,
    `Note: ${latestAnalysis.note}`
  ];
  rows.forEach((line) => {
    doc.text(line, 40, y);
    y += 18;
  });

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Class Probabilities:", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  latestAnalysis.class_probabilities.forEach((p) => {
    doc.text(`- ${p.class}: ${p.probability}%`, 52, y);
    y += 16;
  });

  try {
    const imgData = await Plotly.toImage(probChart3dEl, { format: "png", width: 1000, height: 600 });
    doc.addImage(imgData, "PNG", 40, y + 8, 520, 300);
  } catch (_err) {
    doc.text("Chart snapshot unavailable.", 40, y + 24);
  }

  doc.save(`knee_report_${Date.now()}.pdf`);
}

analyzeBtnEl.addEventListener("click", async () => {
  const file = analyzeFileEl.files && analyzeFileEl.files[0];
  if (!file) {
    safeSetText(reportBoxEl, "Select an image first.");
    return;
  }

  safeSetText(reportBoxEl, "Analyzing...");
  const form = new FormData();
  form.append("image", file);

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const data = await res.json();
    renderReport(data);
  } catch (err) {
    safeSetText(reportBoxEl, `Request failed: ${String(err)}`);
  }
});

downloadPdfBtnEl.addEventListener("click", () => {
  downloadPdfReport();
});
