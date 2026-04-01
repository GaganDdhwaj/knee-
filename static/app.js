const analyzeFileEl = document.getElementById("analyzeFile");
const analyzeBtnEl = document.getElementById("analyzeBtn");
const downloadPdfBtnEl = document.getElementById("downloadPdfBtn");
const reportBoxEl = document.getElementById("reportBox");
const patientNameEl = document.getElementById("patientName");
const urgentAlertEl = document.getElementById("urgentAlert");
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
const confidenceFillEl = document.getElementById("confidenceFill");
const confidenceBadgeEl = document.getElementById("confidenceBadge");
const insightPanelEl = document.getElementById("insightPanel");
const assistantChipEls = document.querySelectorAll(".assistant-chip");
const bgVideoEl = document.getElementById("bgVideo");
const heroCardEls = heroVisualEl ? heroVisualEl.querySelectorAll(".visual-card") : [];
const heroOrbEls = heroVisualEl ? heroVisualEl.querySelectorAll(".orb") : [];
const heroGridEl = heroVisualEl ? heroVisualEl.querySelector(".hero-grid-lines") : null;

let latestAnalysis = null;
let assistantHistory = [];
const PDF_CHART_COLORS = ["#66d9d0", "#90aeb6", "#1f2f36"];

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

async function buildPdfChartImage(report) {
  if (!window.Plotly) return null;
  const exportNode = document.createElement("div");
  exportNode.style.position = "fixed";
  exportNode.style.left = "-99999px";
  exportNode.style.top = "0";
  exportNode.style.width = "900px";
  exportNode.style.height = "420px";
  document.body.appendChild(exportNode);

  try {
    const labels = report.class_probabilities.map((x) => x.class);
    const probs = report.class_probabilities.map((x) => x.probability);
    await Plotly.newPlot(
      exportNode,
      [{
        x: labels,
        y: probs,
        type: "bar",
        marker: { color: PDF_CHART_COLORS },
        text: probs.map((p) => `${p}%`),
        textposition: "outside"
      }],
      {
        title: { text: "Class Confidence", font: { family: "Times New Roman, serif", size: 22, color: "#111111" } },
        paper_bgcolor: "#ffffff",
        plot_bgcolor: "#ffffff",
        font: { family: "Times New Roman, serif", size: 14, color: "#111111" },
        margin: { l: 70, r: 30, b: 60, t: 70 },
        xaxis: { color: "#111111" },
        yaxis: {
          title: "Probability (%)",
          range: [0, 100],
          color: "#111111",
          gridcolor: "rgba(0,0,0,0.10)",
          zerolinecolor: "rgba(0,0,0,0.15)"
        }
      },
      { displayModeBar: false, responsive: false }
    );
    return await Plotly.toImage(exportNode, { format: "png", width: 900, height: 420, scale: 2 });
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
  renderChart(data.report);
  updateModelMessaging(data.report);
  safeSetText(insightPanelEl, buildImprovements(data.report));
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
    doc.setTextColor(0, 0, 0);
  };

  const addBulletList = (items, opts = {}) => {
    items.forEach((item) => {
      ensureSpace(18);
      doc.setFont("times", opts.style || "normal");
      doc.setFontSize(opts.size || 11.5);
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
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(160, 160, 160);
    doc.roundedRect(left - 10, y - 16, contentWidth + 20, 24, 7, 7, "FD");
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(10, 10, 10);
    doc.text(title, left, y);
    doc.setTextColor(0, 0, 0);
    y += 18;
  };

  const addKeyValueRows = (rows) => {
    rows.forEach((row) => {
      addParagraph(`${row.label}: ${row.value}`, { size: 11.5, lineHeight: 15, after: 1 });
    });
    y += 4;
  };

  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("Knee Disease Identifier Report", left, y);
  y += 24;
  addParagraph("Screening summary generated from the uploaded knee X-ray.", {
    style: "italic",
    size: 11,
    color: [85, 85, 85],
    lineHeight: 14,
    after: 8,
  });

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
        color: [180, 0, 0],
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

    addParagraph("Doctor To Visit", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.doctor_to_visit || []);

    addParagraph("Tests To Discuss", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.tests_to_discuss || []);

    addParagraph("Foods To Focus On", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.foods_to_eat || []);

    addParagraph("Habits To Focus On", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.habits || []);

    addParagraph("Suggested Next Steps", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.next_steps || []);

    addParagraph("When To Seek Care", { style: "bold", size: 12, after: 4 });
    addBulletList(latestAnalysis.guidance.when_to_seek_care || []);

    addParagraph(`Disclaimer: ${latestAnalysis.guidance.disclaimer || latestAnalysis.note}`, {
      style: "italic",
      size: 11,
      color: [85, 85, 85],
      lineHeight: 14,
      after: 8,
    });
  }

  try {
    const imgData = await buildPdfChartImage(latestAnalysis);
    if (imgData) {
      ensureSpace(290);
      addSectionHeader("Confidence Chart");
      doc.setDrawColor(180, 180, 180);
      doc.rect(left, y - 4, contentWidth, 230);
      doc.addImage(imgData, "PNG", left + 6, y + 2, contentWidth - 12, 218);
      y += 240;
    } else {
      addSectionHeader("Confidence Chart");
      addParagraph("Chart snapshot unavailable.");
    }
  } catch (_err) {
    addSectionHeader("Confidence Chart");
    addParagraph("Chart snapshot unavailable.");
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
    renderReport(data);
  } catch (err) {
    safeSetText(reportBoxEl, `Request failed: ${String(err)}`);
    setStatus("Request failed. Check your connection or server status.", "error");
  }
});

downloadPdfBtnEl.addEventListener("click", () => {
  downloadPdfReport();
});
