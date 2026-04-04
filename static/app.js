const analyzeFileEl = document.getElementById("analyzeFile");
const analyzeBtnEl = document.getElementById("analyzeBtn");
const downloadPdfBtnEl = document.getElementById("downloadPdfBtn");
const reportBoxEl = document.getElementById("reportBox");
const patientNameEl = document.getElementById("patientName");
const urgentAlertEl = document.getElementById("urgentAlert");
const reportPanelEl = document.getElementById("reportPanel");
const followupPanelEl = document.getElementById("followupPanel");
const followupIntroEl = document.getElementById("followupIntro");
const followupQuestionsEl = document.getElementById("followupQuestions");
const followupSubmitBtnEl = document.getElementById("followupSubmitBtn");
const assistantQuestionEl = document.getElementById("assistantQuestion");
const assistantAskBtnEl = document.getElementById("assistantAskBtn");
const assistantThreadEl = document.getElementById("assistantThread");
const uploadZoneEl = document.getElementById("uploadZone");
const selectedFileMetaEl = document.getElementById("selectedFileMeta");
const previewWrapEl = document.getElementById("previewWrap");
const previewImageEl = document.getElementById("previewImage");
const statusMessageEl = document.getElementById("statusMessage");
const modelStatusEl = document.getElementById("modelStatus");
const confidenceSummaryEl = document.getElementById("confidenceSummary");
const modeSummaryEl = document.getElementById("modeSummary");
const heroVisualEl = document.getElementById("heroVisual");
const predictedClassEl = document.getElementById("predictedClass");
const confidenceValEl = document.getElementById("confidenceVal");
const severityValEl = document.getElementById("severityVal");
const sourceValEl = document.getElementById("sourceVal");
const probBarChartEl = document.getElementById("probBarChart");
const trendLineChartEl = document.getElementById("trendLineChart");
const probPieChartEl = document.getElementById("probPieChart");
const confidenceFillEl = document.getElementById("confidenceFill");
const confidenceBadgeEl = document.getElementById("confidenceBadge");
const insightPanelEl = document.getElementById("insightPanel");
const assistantChipEls = document.querySelectorAll(".assistant-chip");
const bgVideoEl = document.getElementById("bgVideo");
const summaryTextEl = document.getElementById("summaryText");
const examBadgeEl = document.getElementById("examBadge");
const riskLevelCardEl = document.getElementById("riskLevelCard");
const confidenceCardEl = document.getElementById("confidenceCard");
const examCardEl = document.getElementById("examCard");
const sourceCardEl = document.getElementById("sourceCard");
const doctorListEl = document.getElementById("doctorList");
const testsListEl = document.getElementById("testsList");
const foodsListEl = document.getElementById("foodsList");
const stepsListEl = document.getElementById("stepsList");
const heroCardEls = heroVisualEl ? heroVisualEl.querySelectorAll(".visual-card") : [];
const heroOrbEls = heroVisualEl ? heroVisualEl.querySelectorAll(".orb") : [];
const heroGridEl = heroVisualEl ? heroVisualEl.querySelector(".hero-grid-lines") : null;

let latestAnalysis = null;
let pendingAnalysis = null;
let assistantHistory = [];

// FIX: Use clean light colors for PDF bar chart — no dark colors that cause black backgrounds
const PDF_CHART_COLORS = ["#2196a8", "#6e8f97", "#aac4cc"];

const FOLLOWUP_QUESTIONS = [
  {
    id: "pain_level",
    label: "1. How strong is the current knee pain?",
    options: ["None", "Mild", "Moderate", "Severe"]
  },
  {
    id: "mobility_limit",
    label: "2. How much is walking or movement limited?",
    options: ["None", "Slight", "Moderate", "Major"]
  },
  {
    id: "recent_injury",
    label: "3. Was there a recent fall, injury, or suspected fracture?",
    options: ["No", "Yes"]
  },
  {
    id: "known_history",
    label: "4. Is there any known prior bone-health history?",
    options: ["None", "Osteopenia", "Osteoporosis"]
  }
];

if (bgVideoEl && bgVideoEl.parentElement) {
  bgVideoEl.addEventListener("error", () => {
    bgVideoEl.parentElement.classList.add("video-missing");
  });
  bgVideoEl.addEventListener("loadeddata", () => {
    bgVideoEl.parentElement.classList.remove("video-missing");
  });
}

function getHeroBaseTransform(card) {
  if (card.classList.contains("primary-depth")) {
    return "rotateY(-15deg) rotateX(8deg) translateZ(42px)";
  }
  if (card.classList.contains("secondary-depth")) {
    return "rotateY(16deg) rotateX(-6deg) translateZ(20px)";
  }
  if (card.classList.contains("data-card")) {
    return "rotateY(-10deg) rotateX(5deg) translateZ(28px)";
  }
  return "";
}

function applyHeroDepth(offsetX, offsetY) {
  if (!heroVisualEl) return;
  heroVisualEl.style.transform =
    `rotateX(${(-offsetY * 10).toFixed(2)}deg) rotateY(${(offsetX * 14).toFixed(2)}deg)`;

  heroCardEls.forEach((card, index) => {
    const depth = index === 0 ? 30 : index === 1 ? 18 : 24;
    const moveX = offsetX * depth;
    const moveY = offsetY * depth;
    card.style.transform =
      `${getHeroBaseTransform(card)} translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
  });

  heroOrbEls.forEach((orb, index) => {
    const drift = index === 0 ? 18 : -14;
    orb.style.transform = `translate3d(${(offsetX * drift).toFixed(2)}px, ${(offsetY * drift).toFixed(2)}px, 0)`;
  });

  if (heroGridEl) {
    heroGridEl.style.transform =
      `rotateX(70deg) translateZ(-40px) translate3d(${(offsetX * 18).toFixed(2)}px, ${(offsetY * 12).toFixed(2)}px, 0)`;
  }
}

function resetHeroDepth() {
  if (!heroVisualEl) return;
  heroVisualEl.style.transform = "rotateX(0deg) rotateY(0deg)";
  heroCardEls.forEach((card) => {
    card.style.transform = "";
  });
  heroOrbEls.forEach((orb) => {
    orb.style.transform = "";
  });
  if (heroGridEl) {
    heroGridEl.style.transform = "";
  }
}

function safeSetText(el, value) {
  if (el) el.textContent = value;
}

function safeSetWidth(el, value) {
  if (el) el.style.width = value;
}

function renderDashboardList(el, items, fallback) {
  if (!el) return;
  el.innerHTML = "";
  const source = items && items.length ? items : [fallback];
  source.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

function buildFollowupSummary(report) {
  const predicted = report.predicted_class;
  const severity = report.severity_level;
  return `The AI screening result is currently closer to ${predicted} with ${report.confidence}% confidence and ${severity} severity. Answer these follow-up questions so the patient-health dashboard can reflect symptoms, mobility, injury risk, and known history before the final charts are shown.`;
}

function renderFollowupQuestions(report) {
  if (!followupPanelEl || !followupQuestionsEl) return;
  followupPanelEl.hidden = false;
  if (reportPanelEl) reportPanelEl.hidden = true;
  safeSetText(followupIntroEl, buildFollowupSummary(report));
  followupQuestionsEl.innerHTML = "";
  FOLLOWUP_QUESTIONS.forEach((question) => {
    const wrap = document.createElement("div");
    wrap.className = "followup-question";
    const label = document.createElement("label");
    label.className = "followup-label";
    label.textContent = question.label;
    const select = document.createElement("select");
    select.className = "followup-select";
    select.id = `followup-${question.id}`;
    question.options.forEach((option, optionIndex) => {
      const item = document.createElement("option");
      item.value = option;
      item.textContent = option;
      if (optionIndex === 0) item.selected = true;
      select.appendChild(item);
    });
    wrap.appendChild(label);
    wrap.appendChild(select);
    followupQuestionsEl.appendChild(wrap);
  });
}

function getFollowupAnswers() {
  const answers = {};
  FOLLOWUP_QUESTIONS.forEach((question) => {
    const input = document.getElementById(`followup-${question.id}`);
    answers[question.id] = input ? input.value : question.options[0];
  });
  return answers;
}

function adjustProbabilities(report, answers) {
  const probs = {};
  report.class_probabilities.forEach((item) => {
    probs[item.class] = item.probability;
  });
  const painMap = { None: -8, Mild: -2, Moderate: 6, Severe: 14 };
  const mobilityMap = { None: -6, Slight: 0, Moderate: 8, Major: 14 };
  const historyMap = { None: 0, Osteopenia: 8, Osteoporosis: 14 };
  const severeBoost = (painMap[answers.pain_level] || 0) + (mobilityMap[answers.mobility_limit] || 0) + (historyMap[answers.known_history] || 0) + (answers.recent_injury === "Yes" ? 16 : 0);
  probs.Osteoporosis = Math.max(5, probs.Osteoporosis + severeBoost * 0.55);
  probs.Osteopenia = Math.max(5, probs.Osteopenia + severeBoost * 0.25);
  probs.Normal = Math.max(1, probs.Normal - severeBoost * 0.6);
  const total = probs.Normal + probs.Osteopenia + probs.Osteoporosis;
  const normalized = [
    { class: "Osteoporosis", probability: Number(((probs.Osteoporosis / total) * 100).toFixed(2)) },
    { class: "Osteopenia", probability: Number(((probs.Osteopenia / total) * 100).toFixed(2)) },
    { class: "Normal", probability: Number(((probs.Normal / total) * 100).toFixed(2)) }
  ];
  normalized.sort((a, b) => b.probability - a.probability);
  return normalized;
}

function deriveAnsweredReport(report, answers) {
  const answered = JSON.parse(JSON.stringify(report));
  answered.followup_answers = answers;
  answered.class_probabilities = adjustProbabilities(report, answers);
  answered.predicted_class = answered.class_probabilities[0].class;
  answered.confidence = answered.class_probabilities[0].probability;
  answered.severity_level =
    answered.predicted_class === "Osteoporosis" ? "High" :
    answered.predicted_class === "Osteopenia" ? "Medium" : "Low";
  answered.answer_profile = [
    { label: "Imaging Signal", value: report.confidence },
    { label: "Symptom Load", value: Math.min(100, ({"None": 12, "Mild": 32, "Moderate": 64, "Severe": 92}[answers.pain_level] || 20)) },
    { label: "Mobility Stress", value: Math.min(100, ({"None": 10, "Slight": 30, "Moderate": 62, "Major": 88}[answers.mobility_limit] || 20)) },
    { label: "Fracture Risk", value: Math.min(100, answers.recent_injury === "Yes" ? 92 : (answers.known_history === "Osteoporosis" ? 78 : answers.known_history === "Osteopenia" ? 52 : 18)) }
  ];
  answered.guidance.summary = `${report.guidance.summary} Follow-up answers indicate pain is ${answers.pain_level.toLowerCase()}, mobility limitation is ${answers.mobility_limit.toLowerCase()}, recent injury is ${answers.recent_injury.toLowerCase()}, and known history is ${answers.known_history.toLowerCase()}.`;
  if (answers.recent_injury === "Yes" || answers.pain_level === "Severe") {
    answered.guidance.urgent_banner = answered.guidance.urgent_banner || "High-priority follow-up: the symptom answers raise concern for urgent medical review, especially if fracture is possible.";
    answered.guidance.exam_recommended = true;
  }
  return answered;
}

function setStatus(message, tone = "info") {
  if (!statusMessageEl) return;
  statusMessageEl.textContent = message;
  statusMessageEl.style.background =
    tone === "error" ? "#301215" : tone === "success" ? "#0f2728" : "#102126";
  statusMessageEl.style.color =
    tone === "error" ? "#ffb8bf" : tone === "success" ? "#bafff5" : "#dffbff";
  statusMessageEl.style.borderColor =
    tone === "error" ? "rgba(255, 122, 138, 0.28)" : tone === "success" ? "rgba(102, 217, 208, 0.28)" : "rgba(102, 217, 208, 0.18)";
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
  const guidance = report.guidance || {};
  const lines = [];
  lines.push(`Focused Class Insight: ${cls}`);
  lines.push("");
  if (guidance.summary) {
    lines.push(guidance.summary);
    lines.push("");
  }
  if (guidance.confidence_note) {
    lines.push(`Confidence note: ${guidance.confidence_note}`);
  } else if (conf < 65) {
    lines.push("Confidence note: confidence is moderate or low, so image quality and clinical review matter more.");
  }
  if (guidance.model_note) {
    lines.push(`Model note: ${guidance.model_note}`);
  }
  lines.push("");
  if (guidance.foods_to_eat && guidance.foods_to_eat.length) {
    lines.push("Foods to focus on:");
    guidance.foods_to_eat.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (guidance.habits && guidance.habits.length) {
    lines.push("Habits to focus on:");
    guidance.habits.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (guidance.next_steps && guidance.next_steps.length) {
    lines.push("Suggested next steps:");
    guidance.next_steps.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  if (guidance.when_to_seek_care && guidance.when_to_seek_care.length) {
    lines.push("Seek medical care if:");
    guidance.when_to_seek_care.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  lines.push(`Note: ${guidance.disclaimer || "AI output is a screening aid, not a diagnosis."}`);
  return lines.join("\n");
}

function renderChart(report) {
  if (!window.Plotly || !probBarChartEl) return;
  const labels = report.class_probabilities.map((x) => x.class);
  const probs = report.class_probabilities.map((x) => x.probability);
  const colors = ["#66d9d0", "#90aeb6", "#203039"];

  Plotly.newPlot(
    probBarChartEl,
    [{
      x: labels,
      y: probs,
      type: "bar",
      marker: { color: colors },
      text: probs.map((p) => `${p}%`),
      textposition: "outside"
    }],
    {
      title: "Class Confidence",
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#eef8fa" },
      margin: { l: 40, r: 10, b: 40, t: 40 },
      xaxis: { color: "#b8c7cd" },
      yaxis: {
        title: "Probability (%)",
        range: [0, 100],
        color: "#b8c7cd",
        gridcolor: "rgba(102,217,208,0.12)",
        zerolinecolor: "rgba(102,217,208,0.14)"
      }
    },
    { displayModeBar: false, responsive: true }
  );

  probBarChartEl.on("plotly_click", (e) => {
    const cls = e?.points?.[0]?.x;
    safeSetText(insightPanelEl, buildImprovements(report, cls));
  });
}

function renderTrendChart(report) {
  if (!window.Plotly || !trendLineChartEl) return;
  const profile = report.answer_profile || [
    { label: "Imaging Signal", value: report.confidence },
    { label: "Symptom Load", value: 30 },
    { label: "Mobility Stress", value: 30 },
    { label: "Fracture Risk", value: 20 }
  ];
  const labels = profile.map((x) => x.label);
  const probs = profile.map((x) => x.value);
  const baseline = [25, 35, 35, 28];

  Plotly.newPlot(
    trendLineChartEl,
    [
      {
        x: labels,
        y: baseline,
        type: "scatter",
        mode: "lines",
        line: { color: "#8fa1d2", width: 3, dash: "dot" },
        name: "Baseline"
      },
      {
        x: labels,
        y: probs,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#6d4aff", width: 5, shape: "spline", smoothing: 1.1 },
        marker: { color: "#62f6ff", size: 12, line: { color: "#ffffff", width: 2.5 } },
        fill: "tozeroy",
        fillcolor: "rgba(98, 246, 255, 0.22)",
        name: "Model trend"
      }
    ],
    {
      title: { text: "Risk Trend From Answers", font: { color: "#f7fbff", size: 22 } },
      paper_bgcolor: "#0b1730",
      plot_bgcolor: "#0f1d3f",
      font: { color: "#f7fbff", size: 14 },
      margin: { l: 58, r: 28, b: 64, t: 58 },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.14,
        font: { color: "#dbe6ff", size: 12 }
      },
      xaxis: {
        color: "#dbe6ff",
        tickfont: { size: 12 },
        tickangle: -10
      },
      yaxis: {
        title: "Risk Index",
        range: [0, 100],
        color: "#dbe6ff",
        tickfont: { size: 12 },
        titlefont: { size: 13 },
        gridcolor: "rgba(98,246,255,0.14)",
        zerolinecolor: "rgba(125,158,255,0.18)"
      }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderPieChart(report) {
  if (!window.Plotly || !probPieChartEl) return;
  const labels = report.class_probabilities.map((x) => x.class);
  const probs = report.class_probabilities.map((x) => x.probability);

  Plotly.newPlot(
    probPieChartEl,
    [{
      labels,
      values: probs,
      type: "pie",
      hole: 0.55,
      marker: { colors: ["#62f6ff", "#7c5cff", "#b9ff79"] },
      textinfo: "label+percent",
      textfont: { color: "#f7fbff", size: 14 },
      textposition: "outside",
      outsidetextfont: { color: "#f7fbff", size: 13 },
      sort: false,
      direction: "clockwise",
      pull: [0.03, 0.02, 0.02],
      automargin: true
    }],
    {
      title: { text: "Class Share After Answers", font: { color: "#f7fbff", size: 22 } },
      paper_bgcolor: "#0b1730",
      plot_bgcolor: "#0f1d3f",
      font: { color: "#f7fbff", size: 14 },
      margin: { l: 24, r: 24, b: 64, t: 58 },
      showlegend: true,
      legend: {
        orientation: "h",
        x: 0.02,
        y: -0.1,
        font: { color: "#dbe6ff", size: 12 }
      }
    },
    { displayModeBar: false, responsive: true }
  );
}

function renderAllCharts(report) {
  renderChart(report);
  renderTrendChart(report);
  renderPieChart(report);
}

async function buildPdfChartImage(report, kind = "bar") {
  if (!window.Plotly) return null;
  const exportNode = document.createElement("div");
  exportNode.style.position = "fixed";
  exportNode.style.left = "-99999px";
  exportNode.style.top = "0";
  // FIX: Match export node size to toImage size for sharp rendering
  exportNode.style.width = "900px";
  exportNode.style.height = "480px";
  exportNode.style.background = "#ffffff";
  document.body.appendChild(exportNode);

  try {
    const labels = report.class_probabilities.map((x) => x.class);
    const probs = report.class_probabilities.map((x) => x.probability);
    let data;
    let layout;

    if (kind === "line") {
      const profile = report.answer_profile || [
        { label: "Imaging Signal", value: report.confidence },
        { label: "Symptom Load", value: 30 },
        { label: "Mobility Stress", value: 30 },
        { label: "Fracture Risk", value: 20 }
      ];
      const lineLabels = profile.map((x) => x.label);
      const lineProbs = profile.map((x) => x.value);
      const baseline = [25, 35, 35, 28];
      data = [
        {
          x: lineLabels,
          y: baseline,
          type: "scatter",
          mode: "lines",
          // FIX: Use darker visible color for PDF white background
          line: { color: "#666666", width: 2, dash: "dot" },
          name: "Baseline"
        },
        {
          x: lineLabels,
          y: lineProbs,
          type: "scatter",
          mode: "lines+markers",
          // FIX: Use darker blue for PDF white background
          line: { color: "#2b5fa8", width: 3, shape: "spline", smoothing: 1.1 },
          marker: { color: "#1a8fa0", size: 10, line: { color: "#000000", width: 1.5 } },
          fill: "tozeroy",
          fillcolor: "rgba(33, 150, 168, 0.18)",
          name: "Model trend"
        }
      ];
      layout = {
        title: { text: "Risk Trend From Answers", font: { family: "Times New Roman, serif", size: 20, color: "#111111" } },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f9f9f9",
        font: { family: "Times New Roman, serif", size: 13, color: "#111111" },
        margin: { l: 72, r: 32, b: 72, t: 72 },
        legend: { orientation: "h", x: 0, y: 1.1, font: { color: "#111111", size: 12 } },
        xaxis: { color: "#111111", gridcolor: "rgba(0,0,0,0.08)", tickfont: { color: "#111111" } },
        yaxis: {
          title: "Risk Index",
          range: [0, 100],
          color: "#111111",
          gridcolor: "rgba(0,0,0,0.10)",
          zerolinecolor: "rgba(0,0,0,0.15)",
          tickfont: { color: "#111111" }
        }
      };
    } else if (kind === "pie") {
      data = [{
        labels,
        values: probs,
        type: "pie",
        hole: 0.5,
        // FIX: Use colors that are visible on white background
        marker: { colors: ["#2196a8", "#5c4db1", "#5aaa3e"], line: { color: "#ffffff", width: 2 } },
        textinfo: "label+percent",
        textfont: { color: "#111111", size: 13 },
        textposition: "outside",
        outsidetextfont: { color: "#111111", size: 12 },
        sort: false,
        direction: "clockwise",
        pull: [0.03, 0.02, 0.02]
      }];
      layout = {
        title: { text: "Class Share After Answers", font: { family: "Times New Roman, serif", size: 20, color: "#111111" } },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#ffffff",
        font: { family: "Times New Roman, serif", size: 13, color: "#111111" },
        margin: { l: 32, r: 32, b: 64, t: 72 },
        showlegend: true,
        legend: { orientation: "h", x: 0.05, y: -0.08, font: { color: "#111111", size: 12 } }
      };
    } else {
      // Bar chart — keep PNG format as it was already working well
      data = [{
        x: labels,
        y: probs,
        type: "bar",
        // FIX: Use PDF_CHART_COLORS which are now clean light colors
        marker: {
          color: PDF_CHART_COLORS,
          line: { color: "#888888", width: 1 }
        },
        text: probs.map((p) => `${p}%`),
        textposition: "outside",
        textfont: { color: "#111111", size: 13 }
      }];
      layout = {
        title: { text: "Class Confidence", font: { family: "Times New Roman, serif", size: 20, color: "#111111" } },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#f9f9f9",
        font: { family: "Times New Roman, serif", size: 13, color: "#111111" },
        margin: { l: 72, r: 32, b: 72, t: 72 },
        xaxis: { color: "#111111", tickfont: { color: "#111111" } },
        yaxis: {
          title: "Probability (%)",
          range: [0, 110],
          color: "#111111",
          gridcolor: "rgba(0,0,0,0.10)",
          zerolinecolor: "rgba(0,0,0,0.15)",
          tickfont: { color: "#111111" }
        }
      };
    }

    await Plotly.newPlot(exportNode, data, layout, { displayModeBar: false, responsive: false });

    // FIX: Bar chart stays PNG (was working), line/pie use PNG too but at smaller size to reduce file size
    const format = "png";
    const width = kind === "bar" ? 900 : 800;
    const height = kind === "bar" ? 480 : 440;
    // FIX: scale 2 instead of 3 — still sharp but much smaller file size
    return await Plotly.toImage(exportNode, { format, width, height, scale: 2 });
  } finally {
    Plotly.purge(exportNode);
    exportNode.remove();
  }
}

function setPreview(file) {
  if (!file) {
    safeSetText(selectedFileMetaEl, "No file selected.");
    if (previewWrapEl) previewWrapEl.hidden = true;
    if (previewImageEl) previewImageEl.removeAttribute("src");
    return;
  }

  safeSetText(selectedFileMetaEl, `${file.name} - ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
  if (!previewWrapEl || !previewImageEl) return;
  previewImageEl.src = URL.createObjectURL(file);
  previewWrapEl.hidden = false;
}

function validateFile(file) {
  if (!file) return "Select an image first.";
  const allowed = [".png", ".jpg", ".jpeg"];
  const name = file.name.toLowerCase();
  if (!allowed.some((ext) => name.endsWith(ext))) {
    return "Unsupported file type. Use PNG, JPG, or JPEG.";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "File is too large. Keep it under 10 MB.";
  }
  return "";
}

function updateModelMessaging(report) {
  const source = report.model_info.inference_source;
  if (source === "trained_model") {
    safeSetText(modelStatusEl, "Trained model detected. This result used your loaded model file.");
    safeSetText(modeSummaryEl, "Production-style analysis mode using knee_Model.h5.");
  } else {
    safeSetText(modelStatusEl, "Fallback demo mode. This result used the built-in statistical model, not a trained production model.");
    safeSetText(modeSummaryEl, "Demo analysis mode. Add knee_Model.h5 to switch to trained-model inference.");
  }
  safeSetText(
    confidenceSummaryEl,
    `${confidenceBand(report.confidence)} confidence. Review image quality and confirm with clinical assessment.`
  );
}

function renderReport(data) {
  if (!data || !data.ok || !data.report) {
    safeSetText(reportBoxEl, JSON.stringify(data, null, 2));
    setStatus("Analysis failed. Review the returned error details.", "error");
    return;
  }

  latestAnalysis = data.report;
  safeSetText(predictedClassEl, data.report.predicted_class);
  safeSetText(confidenceValEl, `${data.report.confidence}%`);
  safeSetWidth(confidenceFillEl, `${Math.max(0, Math.min(100, data.report.confidence))}%`);
  safeSetText(confidenceBadgeEl, confidenceBand(data.report.confidence));
  safeSetText(severityValEl, data.report.severity_level);
  safeSetText(sourceValEl, data.report.model_info.inference_source);
  if (urgentAlertEl) {
    const urgent = data.report.guidance && data.report.guidance.urgent_banner;
    urgentAlertEl.hidden = !urgent;
    safeSetText(urgentAlertEl, urgent || "");
  }
  renderAllCharts(data.report);
  updateModelMessaging(data.report);
  safeSetText(insightPanelEl, buildImprovements(data.report));
  if (summaryTextEl) {
    safeSetText(summaryTextEl, data.report.guidance?.summary || "No clinical summary is available.");
  }
  if (examBadgeEl) {
    const examRecommended = data.report.guidance?.exam_recommended ? "Exam Recommended" : "Exam Optional";
    safeSetText(examBadgeEl, examRecommended);
    examBadgeEl.dataset.tone = data.report.guidance?.exam_recommended ? "alert" : "ok";
  }
  safeSetText(riskLevelCardEl, data.report.severity_level || "-");
  safeSetText(confidenceCardEl, `${data.report.confidence}%`);
  safeSetText(examCardEl, data.report.guidance?.exam_recommended ? "Yes" : "No");
  safeSetText(sourceCardEl, data.report.model_info?.inference_source || "-");
  renderDashboardList(doctorListEl, data.report.guidance?.doctor_to_visit, "No doctor guidance is available.");
  renderDashboardList(testsListEl, data.report.guidance?.tests_to_discuss, "No suggested tests are available.");
  renderDashboardList(foodsListEl, data.report.guidance?.foods_to_eat, "No food guidance is available.");
  renderDashboardList(stepsListEl, data.report.guidance?.next_steps, "No next-step guidance is available.");
  setStatus("Analysis complete. Review the report and export if needed.", "success");

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
  if (data.report.guidance) {
    if (data.report.guidance.urgent_banner) {
      lines.push(`URGENT: ${data.report.guidance.urgent_banner}`);
      lines.push("");
    }
    lines.push(`Summary: ${data.report.guidance.summary || "-"}`);
    lines.push(`Confidence Note: ${data.report.guidance.confidence_note || "-"}`);
    lines.push(`Model Note: ${data.report.guidance.model_note || "-"}`);
    lines.push(`Medical Examination Recommended: ${data.report.guidance.exam_recommended ? "Yes" : "No"}`);
    lines.push("");
    lines.push("Doctor To Visit:");
    (data.report.guidance.doctor_to_visit || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("Tests To Discuss:");
    (data.report.guidance.tests_to_discuss || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("Foods To Focus On:");
    (data.report.guidance.foods_to_eat || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("Habits To Focus On:");
    (data.report.guidance.habits || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("Suggested Next Steps:");
    (data.report.guidance.next_steps || []).forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }
  lines.push(`Note: ${data.report.note}`);
  if (data.report.warning) lines.push(`Warning: ${data.report.warning}`);
  safeSetText(reportBoxEl, lines.join("\n"));
  assistantHistory = [];
  if (assistantThreadEl) {
    assistantThreadEl.innerHTML = "";
    appendAssistantMessage("Analysis loaded. Ask a question about the report.");
  }
}

function finalizeAnalysisWithAnswers() {
  if (!pendingAnalysis) return;
  const answers = getFollowupAnswers();
  const answeredReport = deriveAnsweredReport(pendingAnalysis, answers);
  latestAnalysis = answeredReport;
  if (followupPanelEl) followupPanelEl.hidden = true;
  if (reportPanelEl) reportPanelEl.hidden = false;
  renderReport({ ok: true, report: answeredReport });
}

function appendChatMessage(role, text) {
  if (!assistantThreadEl) return;
  const node = document.createElement("div");
  node.className = `assistant-msg ${role}`;
  node.textContent = text;
  assistantThreadEl.appendChild(node);
  assistantThreadEl.scrollTop = assistantThreadEl.scrollHeight;
}

function appendAssistantMessage(text) {
  appendChatMessage("assistant", text);
}

function appendUserMessage(text) {
  appendChatMessage("user", text);
}

async function askAssistant(question) {
  if (!latestAnalysis) {
    appendAssistantMessage("Run an analysis first so the assistant can answer from the current report.");
    return;
  }
  const trimmed = (question || "").trim();
  if (!trimmed) {
    appendAssistantMessage("Ask me about meaning, doctor type, tests, food, urgent care, or next steps.");
    return;
  }

  appendUserMessage(trimmed);
  assistantHistory.push({ role: "user", content: trimmed });
  appendAssistantMessage("Thinking...");

  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report: latestAnalysis,
        question: trimmed,
        history: assistantHistory
      })
    });
    const data = await res.json();
    if (!data || !data.ok) {
      throw new Error(data && data.error ? data.error : "Assistant request failed");
    }
    if (assistantThreadEl) {
      assistantThreadEl.lastElementChild.remove();
    }
    assistantHistory.push({ role: "assistant", content: data.reply });
    appendAssistantMessage(data.reply);
  } catch (err) {
    if (assistantThreadEl && assistantThreadEl.lastElementChild) {
      assistantThreadEl.lastElementChild.remove();
    }
    appendAssistantMessage(`Assistant error: ${String(err)}`);
  }
}

async function downloadPdfReport() {
  if (!latestAnalysis) {
    safeSetText(reportBoxEl, "Run analysis first, then download PDF.");
    setStatus("No completed analysis is available for PDF export.", "error");
    return;
  }
  const jsPDFLib = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFLib) {
    safeSetText(reportBoxEl, "PDF library not loaded.");
    setStatus("PDF export library is unavailable.", "error");
    return;
  }

  const doc = new jsPDFLib({ unit: "pt", format: "a4" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 42;
  const right = 42;
  const contentWidth = pageWidth - left - right;
  const signerName = (patientNameEl && patientNameEl.value.trim()) || "________________________";
  let y = 42;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 42) {
      doc.addPage();
      y = 42;
    }
  };

  const addParagraph = (text, opts = {}) => {
    const lineHeight = opts.lineHeight || 15;
    const font = opts.font || "times";
    const style = opts.style || "normal";
    const size = opts.size || 11.5;
    const color = opts.color || [0, 0, 0];
    const indent = opts.indent || 0;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, left + indent, y);
      y += lineHeight;
    });
    y += opts.after || 2;
    // FIX: Always reset text color to pure black after every paragraph
    doc.setTextColor(0, 0, 0);
  };

  const addBulletList = (items, opts = {}) => {
    items.forEach((item) => {
      ensureSpace(18);
      doc.setFont("times", opts.style || "normal");
      doc.setFontSize(opts.size || 11.5);
      // FIX: Always explicitly set black text for bullet lists
      doc.setTextColor(0, 0, 0);
      doc.text("-", left, y);
      const lines = doc.splitTextToSize(item, contentWidth - 14);
      lines.forEach((line, index) => {
        ensureSpace(15);
        doc.text(line, left + 14, y);
        if (index < lines.length - 1) y += 15;
      });
      y += 17;
    });
    y += 2;
  };

  const addSectionHeader = (title) => {
    ensureSpace(34);
    doc.setFillColor(240, 240, 240);
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(left - 10, y - 16, contentWidth + 20, 24, 7, 7, "FD");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    // FIX: Explicitly set dark text for section headers
    doc.setTextColor(10, 10, 10);
    doc.text(title, left, y);
    // FIX: Reset to black after header
    doc.setTextColor(0, 0, 0);
    y += 18;
  };

  const addKeyValueRows = (rows) => {
    rows.forEach((row) => {
      // FIX: Reset color before each row
      doc.setTextColor(0, 0, 0);
      addParagraph(`${row.label}: ${row.value}`, { size: 11.5, lineHeight: 15, after: 1 });
    });
    y += 4;
  };

  // FIX: Set white page background explicitly
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text("Knee Disease Identifier Report", left, y);
  y += 24;
  addParagraph("Screening summary generated from the uploaded knee X-ray.", {
    style: "italic",
    size: 11,
    color: [85, 85, 85],
    lineHeight: 14,
    after: 8,
  });

  addSectionHeader("Patient Health Dashboard");
  doc.setDrawColor(180, 180, 180);
  doc.setFillColor(248, 248, 248);
  const dashCardWidth = (contentWidth - 18) / 2;
  const dashCardHeight = 56;
  const dashboardCards = [
    { label: "Risk Level", value: latestAnalysis.severity_level },
    { label: "Model Confidence", value: `${latestAnalysis.confidence}%` },
    { label: "Exam Recommended", value: latestAnalysis.guidance?.exam_recommended ? "Yes" : "No" },
    { label: "Inference Mode", value: latestAnalysis.model_info.inference_source },
  ];
  dashboardCards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = left + col * (dashCardWidth + 18);
    const yOffset = y + row * (dashCardHeight + 12);
    doc.setFillColor(248, 248, 248);
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(x, yOffset, dashCardWidth, dashCardHeight, 10, 10, "FD");
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(card.label, x + 12, yOffset + 18);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(10, 10, 10);
    doc.text(card.value, x + 12, yOffset + 40);
  });
  y += 2 * (dashCardHeight + 12) + 8;
  // FIX: Reset after dashboard cards
  doc.setTextColor(0, 0, 0);

  addSectionHeader("Core Findings");
  addKeyValueRows([
    { label: "Predicted Class", value: latestAnalysis.predicted_class },
    { label: "Confidence", value: `${latestAnalysis.confidence}%` },
    { label: "Severity", value: latestAnalysis.severity_level },
    { label: "Inference Source", value: latestAnalysis.model_info.inference_source },
    { label: "Analysis Time", value: `${latestAnalysis.analysis_time_ms || 0} ms` },
    { label: "Views Used", value: `${latestAnalysis.views_used || 1}` },
    { label: "Architecture", value: latestAnalysis.model_info.architecture },
    { label: "Image Size", value: latestAnalysis.model_info.image_size },
    { label: "Dataset Source", value: latestAnalysis.dataset_url || "-" },
    { label: "Note", value: latestAnalysis.note },
  ]);

  addSectionHeader("Class Probabilities");
  addBulletList(latestAnalysis.class_probabilities.map((p) => `${p.class}: ${p.probability}%`));

  if (latestAnalysis.guidance) {
    addSectionHeader("Guidance");
    if (latestAnalysis.guidance.urgent_banner) {
      addParagraph(`URGENT: ${latestAnalysis.guidance.urgent_banner}`, {
        style: "bold",
        size: 12,
        color: [185, 24, 24],
        lineHeight: 17,
        after: 8,
      });
    }

    addKeyValueRows([
      { label: "Summary", value: latestAnalysis.guidance.summary || "-" },
      { label: "Confidence Note", value: latestAnalysis.guidance.confidence_note || "-" },
      { label: "Model Note", value: latestAnalysis.guidance.model_note || "-" },
      { label: "Medical Examination Recommended", value: latestAnalysis.guidance.exam_recommended ? "Yes" : "No" },
    ]);

    addParagraph("Doctor To Visit", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.doctor_to_visit || ["See a primary care clinician."]);

    addParagraph("Tests To Discuss", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.tests_to_discuss || ["Discuss appropriate testing with a clinician."]);

    addParagraph("Foods To Focus On", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.foods_to_eat || []);

    addParagraph("Habits To Focus On", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.habits || []);

    addParagraph("Suggested Next Steps", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.next_steps || []);

    addParagraph("When To Seek Care", { style: "bold", size: 12, after: 4, color: [0, 0, 0] });
    addBulletList(latestAnalysis.guidance.when_to_seek_care || []);

    addParagraph(`Disclaimer: ${latestAnalysis.guidance.disclaimer || latestAnalysis.note}`, {
      style: "italic",
      size: 11,
      color: [85, 85, 85],
      lineHeight: 14,
      after: 8,
    });
  }

  // Bar chart — PNG, good quality
  try {
    const imgData = await buildPdfChartImage(latestAnalysis, "bar");
    if (imgData) {
      ensureSpace(300);
      addSectionHeader("Confidence Chart");
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(180, 180, 180);
      doc.roundedRect(left, y - 4, contentWidth, 248, 12, 12, "FD");
      doc.addImage(imgData, "PNG", left + 10, y + 6, contentWidth - 20, 230);
      y += 258;
    } else {
      addSectionHeader("Confidence Chart");
      addParagraph("Chart snapshot unavailable.");
    }
  } catch (_err) {
    addSectionHeader("Confidence Chart");
    addParagraph("Chart snapshot unavailable.");
  }

  // Line and Pie charts — PNG, smaller size
  try {
    const lineImg = await buildPdfChartImage(latestAnalysis, "line");
    const pieImg = await buildPdfChartImage(latestAnalysis, "pie");
    if (lineImg || pieImg) {
      ensureSpace(300);
      addSectionHeader("Additional Charts");
      const halfWidth = (contentWidth - 16) / 2;
      if (lineImg) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(180, 180, 180);
        doc.roundedRect(left, y, halfWidth, 210, 10, 10, "FD");
        doc.addImage(lineImg, "PNG", left + 6, y + 6, halfWidth - 12, 198);
      }
      if (pieImg) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(180, 180, 180);
        doc.roundedRect(left + halfWidth + 16, y, halfWidth, 210, 10, 10, "FD");
        doc.addImage(pieImg, "PNG", left + halfWidth + 22, y + 6, halfWidth - 12, 198);
      }
      y += 222;
    }
  } catch (_err) {
    // Keep PDF export resilient if supplementary charts fail.
  }

  addSectionHeader("Signature");
  addKeyValueRows([
    { label: "Name", value: signerName },
    { label: "Signature", value: "________________________" },
  ]);

  doc.save(`knee_report_${Date.now()}.pdf`);
  setStatus("PDF report downloaded.", "success");
}

function handleSelectedFile(file) {
  const error = validateFile(file);
  if (error) {
    setPreview(null);
    setStatus(error, "error");
    return false;
  }
  setPreview(file);
  setStatus("Image ready. Click Analyze Image to continue.", "info");
  return true;
}

analyzeFileEl.addEventListener("change", () => {
  const file = analyzeFileEl.files && analyzeFileEl.files[0];
  handleSelectedFile(file);
});

if (uploadZoneEl) {
  ["dragenter", "dragover"].forEach((eventName) => {
    uploadZoneEl.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZoneEl.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    uploadZoneEl.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZoneEl.classList.remove("dragover");
    });
  });

  uploadZoneEl.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    analyzeFileEl.files = transfer.files;
    handleSelectedFile(file);
  });
}

if (heroVisualEl) {
  heroVisualEl.addEventListener("mousemove", (event) => {
    const rect = heroVisualEl.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
    applyHeroDepth(offsetX, offsetY);
  });

  heroVisualEl.addEventListener("mouseleave", () => {
    resetHeroDepth();
  });
}

assistantChipEls.forEach((chip) => {
  chip.addEventListener("click", () => {
    const question = chip.getAttribute("data-question") || "";
    if (assistantQuestionEl) assistantQuestionEl.value = question;
    askAssistant(question);
  });
});

if (assistantAskBtnEl) {
  assistantAskBtnEl.addEventListener("click", () => {
    const question = assistantQuestionEl ? assistantQuestionEl.value : "";
    askAssistant(question);
    if (assistantQuestionEl) assistantQuestionEl.value = "";
  });
}

if (assistantQuestionEl) {
  assistantQuestionEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const question = assistantQuestionEl.value;
      askAssistant(question);
      assistantQuestionEl.value = "";
    }
  });
}

if (followupSubmitBtnEl) {
  followupSubmitBtnEl.addEventListener("click", () => {
    finalizeAnalysisWithAnswers();
  });
}

analyzeBtnEl.addEventListener("click", async () => {
  const file = analyzeFileEl.files && analyzeFileEl.files[0];
  const error = validateFile(file);
  if (error) {
    safeSetText(reportBoxEl, error);
    setStatus(error, "error");
    return;
  }

  safeSetText(reportBoxEl, "Analyzing...");
  setStatus("Analysis in progress. This may take a few seconds.", "info");
  const form = new FormData();
  form.append("image", file);

  try {
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const data = await res.json();
    if (!data || !data.ok || !data.report) {
      renderReport(data);
      return;
    }
    pendingAnalysis = data.report;
    latestAnalysis = null;
    renderFollowupQuestions(data.report);
    safeSetText(reportBoxEl, "AI follow-up questions are ready. Answer them to generate the dashboard.");
    setStatus("AI follow-up ready. Answer the patient questions to build the final dashboard.", "success");
  } catch (err) {
    safeSetText(reportBoxEl, `Request failed: ${String(err)}`);
    setStatus("Request failed. Check your connection or server status.", "error");
  }
});

downloadPdfBtnEl.addEventListener("click", () => {
  downloadPdfReport();
});