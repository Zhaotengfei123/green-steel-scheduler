import {
  PLANT_CONFIG,
  DEFAULT_ORDERS,
  DEFAULT_SETTINGS,
  schedulePlan,
  formatClock,
  formatDuration,
  planToCsv,
  normalizeRefineType,
  refineTypeLabel,
} from "./scheduler.js";

const AUTH = { account: "135792468", password: "666999" };
const SESSION_KEY = "greenSteelSchedulerAuth";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = (value) => JSON.parse(JSON.stringify(value));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });

const state = {
  orders: clone(DEFAULT_ORDERS),
  plan: null,
  planDate: "2026-11-04",
  running: false,
  ganttPlant: 1,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return "—";
  return numberFormat.format(Number(Number(value).toFixed(digits)));
}

function toClockCode(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function trySessionRead() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "ok";
  } catch {
    return false;
  }
}

function trySessionWrite(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, "ok");
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Session storage is optional; login remains valid for the current page.
  }
}

function setLoginError(message = "") {
  $("#login-error").textContent = message;
}

function updateHeroDate(dateValue = state.planDate) {
  const parts = String(dateValue).split("-");
  $("#hero-date").textContent = parts.length === 3 ? parts.join(".") : dateValue;
}

const slideNames = ["总览", "计划输入", "甘特排程", "炉次明细", "减碳核算", "设备能力"];
let slideIndex = 0;

function goToSlide(index, { instant = false } = {}) {
  slideIndex = Math.max(0, Math.min(slideNames.length - 1, Number(index) || 0));
  const track = $("#deck-track");
  if (!track) return;
  track.style.transition = instant ? "none" : "";
  track.style.transform = `translate3d(-${slideIndex * 100}vw, 0, 0)`;
  $$(".topnav [data-slide-target]").forEach((button) => {
    const active = Number(button.dataset.slideTarget) === slideIndex;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  $$(".deck-slide").forEach((slide, index) => {
    slide.setAttribute("aria-hidden", index === slideIndex ? "false" : "true");
  });
  $("#slide-counter").textContent = `${String(slideIndex + 1).padStart(2, "0")} / ${String(slideNames.length).padStart(2, "0")}`;
  $("#slide-label").textContent = slideNames[slideIndex];
  $("#prev-slide").disabled = slideIndex === 0;
  $("#next-slide").disabled = slideIndex === slideNames.length - 1;
  if (instant) requestAnimationFrame(() => { track.style.transition = ""; });
}

function isEditingTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("input, select, textarea, button, [contenteditable='true']"));
}

function openApp({ remember = true } = {}) {
  if (remember) trySessionWrite(true);
  $("#auth-screen").hidden = true;
  $("#app-shell").hidden = false;
  renderDemandTable();
  $("#plan-date").value = state.planDate;
  updateHeroDate(state.planDate);
  runSchedule({ animate: false, silent: true });
  goToSlide(0, { instant: true });
}


function closeApp() {
  trySessionWrite(false);
  state.plan = null;
  $("#app-shell").hidden = true;
  $("#auth-screen").hidden = false;
  $("#password").value = "";
  $("#account").focus();
}

function plantOptions(selected) {
  return Object.entries(PLANT_CONFIG)
    .map(([id, plant]) => `<option value="${id}" ${String(selected) === id ? "selected" : ""}>${plant.name}</option>`)
    .join("");
}

function refineOptions(selected) {
  return ["AUTO", "ARGON", "DV", "RH", "LF"]
    .map((type) => `<option value="${type}" ${normalizeRefineType(selected) === type ? "selected" : ""}>${refineTypeLabel(type)}</option>`)
    .join("");
}

function renderDemandTable() {
  const body = $("#demand-body");
  body.innerHTML = state.orders
    .map(
      (order, index) => `
        <tr data-order-index="${index}">
          <td><select data-field="plant" aria-label="工厂">${plantOptions(order.plant)}</select></td>
          <td><input data-field="id" value="${escapeHtml(order.id)}" aria-label="订单号" /></td>
          <td><input data-field="grade" value="${escapeHtml(order.grade)}" aria-label="钢种" /></td>
          <td><select data-field="refineType" aria-label="精炼方式">${refineOptions(order.refineType)}</select></td>
          <td><input data-field="heats" type="number" min="1" max="12" step="1" value="${escapeHtml(order.heats)}" aria-label="炉数" /></td>
          <td><input data-field="heatWeight" type="number" min="1" max="300" step="1" value="${escapeHtml(order.heatWeight)}" aria-label="单炉吨数" /></td>
          <td><input data-field="product" value="${escapeHtml(order.product || "连铸坯")}" aria-label="产品" /></td>
          <td><button class="remove-order" type="button" data-remove-index="${index}" aria-label="删除订单">×</button></td>
        </tr>`,
    )
    .join("");
}

function readOrdersFromTable() {
  return $$("#demand-body tr").map((row, index) => ({
    id: $('[data-field="id"]', row).value.trim() || `订单-${index + 1}`,
    plant: Number($('[data-field="plant"]', row).value),
    grade: $('[data-field="grade"]', row).value.trim() || "未指定",
    route: "BOF",
    refineType: $('[data-field="refineType"]', row).value,
    heats: Number($('[data-field="heats"]', row).value),
    heatWeight: Number($('[data-field="heatWeight"]', row).value),
    product: $('[data-field="product"]', row).value.trim() || "连铸坯",
    dueTime: "22:00",
  }));
}

function addOrder() {
  const sequence = String(Date.now()).slice(-4);
  state.orders.push({
    id: `一厂-${sequence}`,
    plant: 1,
    grade: "Q235B",
    route: "BOF",
    heats: 2,
    heatWeight: 95,
    product: "热轧卷",
    dueTime: "22:00",
  });
  renderDemandTable();
  const lastId = $('#demand-body tr:last-child [data-field="id"]');
  lastId?.focus();
  lastId?.select();
}

function removeOrder(index) {
  state.orders.splice(index, 1);
  renderDemandTable();
}

function updateAgentSteps(doneCount, activeIndex = -1) {
  $$(".agent-step").forEach((step, index) => {
    step.classList.toggle("done", index < doneCount);
    step.classList.toggle("active", index === activeIndex);
    const status = $("em", step);
    if (index < doneCount) status.textContent = "已完成";
    else if (index === activeIndex) status.textContent = "计算中";
    else status.textContent = "待执行";
  });
}

async function animateAgent() {
  const stages = [
    [0, "拆解订单炉次"],
    [1, "匹配冶炼与精炼设备"],
    [2, "编排连铸浇次"],
    [3, "核算碳排与完工时长"],
  ];
  $("#agent-status").textContent = "碳约束求解中";
  $("#agent-status-note").textContent = "正在并行评估设备容量、工序等待与减碳路径。";
  for (let index = 0; index < stages.length; index += 1) {
    updateAgentSteps(index, index);
    await sleep(index === 3 ? 300 : 230);
  }
  updateAgentSteps(stages.length);
}

function equipmentPlant(unitId) {
  const match = String(unitId).match(/^P(\d)/);
  return match ? PLANT_CONFIG[match[1]] : null;
}

function renderGantt(plan) {
  const plantId = Number(state.ganttPlant || 1);
  const plant = PLANT_CONFIG[plantId];
  const plantHeats = plan.heatPlans.filter((heat) => heat.plant === plantId);
  const plantTasks = plan.tasks.filter((task) => task.plant === plantId);
  const plantTons = plantHeats.reduce((sum, heat) => sum + heat.tons, 0);
  const startMinute = plantHeats.length ? Math.min(...plantHeats.map((heat) => heat.start)) : plan.startMinute;
  const endMinute = plantHeats.length ? Math.max(...plantHeats.map((heat) => heat.end)) : plan.endMinute;
  const chartStart = Math.floor(startMinute / 60) * 60;
  const chartEnd = Math.ceil((endMinute + 15) / 60) * 60;
  const hourWidth = 190;
  const chartWidth = Math.max(1200, Math.ceil((chartEnd - chartStart) / 60) * hourWidth);
  const units = [
    ...plant.steelmaking.map((unit) => ({ ...unit, group: "steel" })),
    ...plant.refining.map((unit) => ({ ...unit, group: "refine" })),
    ...plant.casting.map((unit) => ({ ...unit, group: "cast" })),
  ];
  const ticks = [];
  for (let minute = chartStart; minute <= chartEnd; minute += 60) {
    const left = ((minute - chartStart) / 60) * hourWidth;
    ticks.push(`<div class="time-tick" style="left:${left}px"><span>${formatClock(minute)}</span></div>`);
  }

  const rows = units.map((unit) => {
    const unitTasks = plantTasks.filter((task) => task.equipmentId === unit.id).sort((a, b) => a.start - b.start);
    const bars = unitTasks.map((task) => {
      const left = ((task.start - chartStart) / 60) * hourWidth;
      const width = (task.duration / 60) * hourWidth;
      const heatNumber = task.heatId.match(/-H(\d+)$/)?.[1] || "1";
      const shortHeat = `第${Number(heatNumber)}炉`;
      const label = width >= 95 ? `${shortHeat} ${formatClock(task.start)}` : "";
      const title = `${shortHeat}｜${task.stageLabel}｜${unit.label}｜${formatClock(task.start)}–${formatClock(task.end)}｜${task.tons}吨`;
      return `<div class="gantt-bar ${task.stage.toLowerCase()} ${width < 26 ? "is-tiny" : ""}" style="left:${left}px;width:${Math.max(5, width)}px" title="${escapeHtml(title)}">${escapeHtml(label)}</div>`;
    }).join("");
    const kind = unit.group === "steel"
      ? "转炉"
      : unit.group === "refine"
        ? ({ ARGON: "吹氩站", DV: "DV炉", RH: "RH真空", LF: "LF钢包" }[unit.type] || "精炼炉")
        : "连铸";
    return `
      <div class="gantt-row-label" title="${escapeHtml(`${plant.name} ${unit.label}`)}">
        <span>${escapeHtml(unit.label)}</span>
        <span class="unit-kind">${escapeHtml(kind)} · ${unit.capacity}吨</span>
      </div>
      <div class="gantt-row" aria-label="${escapeHtml(`${plant.name} ${unit.label} 甘特行`)}">${bars}</div>`;
  }).join("");

  $("#gantt-root").innerHTML = `
    <section class="plant-gantt single-plant" aria-label="${plant.name}设备排程">
      <div class="plant-gantt-head">
        <div class="plant-gantt-title">
          <strong>${plant.name}生产序列</strong>
          <span>${plantHeats.length} 炉 · ${fmt(plantTons)} 吨</span>
        </div>
        <span class="plant-gantt-meta">${plantHeats.length ? `${formatClock(startMinute)} → ${formatClock(endMinute)}` : "无任务"}</span>
      </div>
      <div class="gantt-scroller">
        <div class="gantt-grid" style="--chart-width:${chartWidth}px;--hour-width:${hourWidth}px">
          <div class="gantt-corner">设备 / 时间</div>
          <div class="time-axis">${ticks.join("")}</div>
          ${rows}
        </div>
      </div>
    </section>`;

  $$("[data-gantt-plant]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.ganttPlant) === plantId);
  });
}
function taskFor(heat, stage) {
  return heat.tasks.find((task) => task.stage === stage);
}

function displayHeatId(heatId) {
  return heatId.replace(/-H0?(\d+)$/, "-第$1炉");
}

function renderScheduleTable(plan) {
  const body = $("#schedule-body");
  body.innerHTML = plan.heatPlans
    .map((heat) => {
      const steel = taskFor(heat, "STEEL");
      const refine = taskFor(heat, "REFINE");
      const cast = taskFor(heat, "CAST");
      return `
        <tr>
          <td class="heat-name">${escapeHtml(displayHeatId(heat.heatId))}</td>
          <td>${heat.plant}厂</td>
          <td><span class="route-pill ${heat.route.toLowerCase()}">${"转炉"}</span></td>
          <td>${escapeHtml(heat.grade)}</td>
          <td><span class="schedule-equipment"><strong>${heat.plant}厂 · ${escapeHtml(steel.equipmentLabel)}</strong><span class="time-cell">${formatClock(steel.start)} → ${formatClock(steel.end)}</span></span></td>
          <td><span class="schedule-equipment"><strong>${heat.plant}厂 · ${escapeHtml(refine.equipmentLabel)}</strong><span class="time-cell">${formatClock(refine.start)} → ${formatClock(refine.end)}</span></span></td>
          <td><span class="schedule-equipment"><strong>${heat.plant}厂 · ${escapeHtml(cast.equipmentLabel)}</strong><span class="time-cell">${formatClock(cast.start)} → ${formatClock(cast.end)}</span></span></td>
          <td class="wait-cell">${heat.totalWait} 分钟</td>
        </tr>`;
    })
    .join("");
}

function renderCarbon(plan) {
  const carbon = plan.carbon;
  const scheduledRatio = carbon.baselineCarbon ? (carbon.scheduledCarbon / carbon.baselineCarbon) * 100 : 0;
  $("#carbon-big").textContent = fmt(carbon.carbonSaved);
  $("#baseline-carbon").textContent = `${fmt(carbon.baselineCarbon)} 吨`;
  $("#scheduled-carbon").textContent = `${fmt(carbon.scheduledCarbon)} 吨`;
  $("#carbon-percent").textContent = `${fmt(carbon.carbonReductionPercent)}%`;
  $("#carbon-per-ton").textContent = `${fmt(carbon.scheduledCarbon / plan.totals.tons, 2)} 吨`;
  $("#carbon-scrap").textContent = `${fmt(carbon.scrapRatio, 0)}%`;
  $("#carbon-heat-count").textContent = `${plan.totals.heats} 炉`;
  $("#carbon-caption").textContent = `相对常规转炉基准的场景减排量，减排比例 ${fmt(carbon.carbonReductionPercent)}%。`;
  window.requestAnimationFrame(() => {
    $("#baseline-bar").style.width = "100%";
    $("#scheduled-bar").style.width = `${Math.max(0, Math.min(100, scheduledRatio))}%`;
  });
}

function renderEquipment(plan) {
  const summaryById = new Map(plan.equipmentSummary.map((unit) => [unit.id, unit]));
  const groups = [
    { key: "steelmaking", label: "炼钢设备", className: "steel" },
    { key: "refining", label: "精炼设备", className: "refine" },
    { key: "casting", label: "连铸设备", className: "cast" },
  ];
  $("#equipment-grid").innerHTML = Object.entries(PLANT_CONFIG)
    .map(([plantId, plant]) => {
      const groupHtml = groups
        .map((group) => {
          const units = plant[group.key];
          const items = units
            .map((unit) => {
              const summary = summaryById.get(unit.id) || { utilization: 0, taskCount: 0 };
              const utilization = Math.min(100, Math.round(summary.utilization * 100));
              const typeLabel = group.key === "steelmaking" ? "转炉" : group.key === "refining" ? ({ ARGON: "吹氩站", DV: "DV炉", RH: "RH真空", LF: "LF钢包" }[unit.type] || "精炼") : "连铸";
              return `
                <div class="equipment-item ${group.className}">
                  <div class="equipment-item-top">
                    <strong>${escapeHtml(unit.label)}</strong>
                    <span>${typeLabel} · ${unit.capacity}吨</span>
                  </div>
                  <div class="equipment-item-top">
                    <span>${summary.taskCount} 道工序</span>
                    <span>${utilization}%</span>
                  </div>
                  <div class="load-track"><i style="width:${utilization}%"></i></div>
                </div>`;
            })
            .join("");
          return `
            <div class="equipment-group">
              <span class="equipment-group-label">${group.label} · ${units.length} 台</span>
              <div class="equipment-list">${items}</div>
            </div>`;
        })
        .join("");
      return `
        <section class="equipment-plant">
          <div class="equipment-plant-head">
            <strong>${plant.name}设备池</strong>
            <span>${plant.steelmaking.length + plant.refining.length + plant.casting.length} 台</span>
          </div>
          ${groupHtml}
        </section>`;
    })
    .join("");
}

function renderAll(plan) {
  state.plan = plan;
  updateHeroDate();
  $("#metric-tons").textContent = `${fmt(plan.totals.tons)} 吨`;
  $("#metric-makespan").textContent = toClockCode(plan.makespan);
  $("#metric-makespan-note").textContent = `${formatClock(plan.startMinute)} → ${formatClock(plan.endMinute)}`;
  $("#metric-carbon").textContent = `${fmt(plan.carbon.carbonSaved)} 吨`;
  $("#metric-carbon-note").textContent = `减排 ${fmt(plan.carbon.carbonReductionPercent)}% · 场景估算`;
  $("#metric-eaf").textContent = `${fmt(plan.carbon.scrapRatio, 0)}%`;

  $("#agent-status").textContent = "三厂日计划已生成";
  $("#agent-status-note").textContent = `${plan.totals.orders} 个订单已拆解为 ${plan.totals.heats} 个炉次、${plan.tasks.length} 道工序。`;
  $("#summary-heats").textContent = `${plan.totals.heats} 炉`;
  $("#summary-wait").textContent = `${fmt(plan.totals.averageWait, 0)} 分钟`;
  $("#summary-bottleneck").textContent = `${equipmentPlant(plan.bottleneck.id)?.name || ""} ${plan.bottleneck.equipmentLabel || plan.bottleneck.label}`;
  $("#summary-end").textContent = formatClock(plan.endMinute);
  $("#agent-insight").textContent = `三厂共排入 ${plan.totals.heats} 个炉次，转炉废钢比设为 ${fmt(plan.carbon.scrapRatio, 0)}%；相对常规转炉基准，预计日减排 ${fmt(plan.carbon.carbonSaved)} 吨二氧化碳当量。`;
  updateAgentSteps(4);

  renderGantt(plan);
  renderScheduleTable(plan);
  renderCarbon(plan);
  renderEquipment(plan);
}

async function runSchedule({ animate = true, silent = false } = {}) {
  if (state.running) return;
  const errorNode = $("#form-error");
  errorNode.textContent = "";
  let plan;
  try {
    const orders = readOrdersFromTable();
    if (!orders.length) throw new Error("请至少保留一个排产订单");
    state.orders = orders;
    state.planDate = $("#plan-date").value || state.planDate;
    const settings = {
      ...DEFAULT_SETTINGS,
      startTime: $("#start-time").value || DEFAULT_SETTINGS.startTime,
      scrapRatio: Number($("#scrap-ratio").value),
    };
    plan = schedulePlan(orders, settings);
  } catch (error) {
    errorNode.textContent = error.message;
    if (!silent) showToast(error.message);
    return;
  }

  state.running = true;
  const button = $("#run-schedule");
  const originalText = button.innerHTML;
  button.disabled = true;
  button.textContent = animate ? "碳约束求解中…" : "生成排产计划…";
  try {
    if (animate) await animateAgent();
    renderAll(plan);
    if (!silent) showToast("日计划已生成，一厂、二厂、三厂甘特图已更新");
  } finally {
    state.running = false;
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

function resetDemo() {
  state.orders = clone(DEFAULT_ORDERS);
  state.planDate = "2026-11-04";
  renderDemandTable();
  $("#plan-date").value = state.planDate;
  $("#start-time").value = DEFAULT_SETTINGS.startTime;
  $("#scrap-ratio").value = DEFAULT_SETTINGS.scrapRatio;
  $("#scrap-output").value = DEFAULT_SETTINGS.scrapRatio;
  updateHeroDate();
  runSchedule({ animate: true, silent: true });
  showToast("已恢复一厂、二厂、三厂示例日计划");
}

function ensureExcelLibrary() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) {
      resolve(window.XLSX);
      return;
    }
    const script = document.createElement("script");
    script.src = "vendor/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => reject(new Error("Excel 导出组件加载失败"));
    document.head.appendChild(script);
  });
}

async function downloadPlanTemplate() {
  try {
    const XLSX = await ensureExcelLibrary();
    const workbook = XLSX.utils.book_new();
    const rows = [
      ["工厂", "订单号", "钢种", "精炼方式", "炉数", "单炉吨数", "产品", "交货时间"],
      ["一厂", "一厂-示例01", "Q355B", "钢包吹氩", 3, 95, "方坯", "20:00"],
      ["一厂", "一厂-示例02", "HRB400E", "DV炉", 2, 95, "方坯", "18:00"],
      ["二厂", "二厂-示例01", "Q235B", "RH真空", 3, 240, "板坯", "22:00"],
      ["二厂", "二厂-示例02", "DC01", "LF钢包", 2, 240, "板坯", "21:00"],
      ["三厂", "三厂-示例01", "Q345B", "RH真空", 3, 175, "宽板坯", "22:00"],
      ["三厂", "三厂-示例02", "SPHC", "LF钢包", 2, 175, "宽板坯", "20:00"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [10, 18, 14, 14, 10, 13, 14, 13].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, "排产计划输入");

    const notes = XLSX.utils.aoa_to_sheet([
      ["填写说明"],
      ["工厂", "可填写 一厂、二厂、三厂，或 1、2、3。"],
      ["精炼方式", "可填写 钢包吹氩、DV炉、RH真空、LF钢包，或填写 自动匹配。"],
      ["炉数", "正整数，系统会拆分为独立炉次。"],
      ["单炉吨数", "一厂不超过100吨，二厂不超过250吨，三厂不超过180吨。"],
      ["产品", "可填写 方坯、板坯、宽板坯等，用于计划展示。"],
      ["注意", "请保留“排产计划输入”工作表及首行表头，示例行可直接替换。"],
    ]);
    notes["!cols"] = [{ wch: 16 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, notes, "填写说明");
    XLSX.writeFile(workbook, "绿钢智序_排产计划导入模板.xlsx", { compression: true });
    showToast("Excel 导入模板已下载");
  } catch (error) {
    showToast(error.message || "模板下载失败");
  }
}

function plantFromExcel(value) {
  const text = String(value ?? "").trim();
  if (text.includes("三") || text === "3" || text === "3厂") return 3;
  if (text.includes("二") || text === "2" || text === "2厂") return 2;
  if (text.includes("一") || text === "1" || text === "1厂") return 1;
  return null;
}

async function importPlanFromExcel(file) {
  try {
    const XLSX = await ensureExcelLibrary();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets["排产计划输入"] || workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("Excel 中没有可读取的工作表");
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    if (!rows.length) throw new Error("Excel 计划中没有订单数据");

    const orders = rows
      .map((row, index) => {
        const plant = plantFromExcel(row["工厂"] ?? row["分厂"]);
        const heats = Number(row["炉数"]);
        const heatWeight = Number(row["单炉吨数"] ?? row["单炉吨"] ?? row["炉重"]);
        if (!plant || !Number.isFinite(heats) || heats < 1 || !Number.isFinite(heatWeight) || heatWeight <= 0) {
          return null;
        }
        return {
          id: String(row["订单号"] ?? row["订单"] ?? `导入订单-${index + 1}`).trim(),
          plant,
          grade: String(row["钢种"] ?? row["牌号"] ?? "未指定").trim(),
          route: "BOF",
          refineType: normalizeRefineType(row["精炼方式"] ?? row["精炼"] ?? "自动匹配"),
          heats,
          heatWeight,
          product: String(row["产品"] ?? "连铸坯").trim(),
          dueTime: String(row["交货时间"] ?? "22:00").trim(),
        };
      })
      .filter(Boolean);

    if (!orders.length) throw new Error("未识别到有效订单，请检查工厂、炉数和单炉吨数");
    state.orders = orders;
    renderDemandTable();
    await runSchedule({ animate: false, silent: true });
    showToast(`已从 Excel 导入 ${orders.length} 个订单`);
  } catch (error) {
    showToast(error.message || "Excel 导入失败");
  }
}
async function exportExcel() {
  if (!state.plan) {
    showToast("请先生成排产计划");
    return;
  }
  let XLSX;
  try {
    XLSX = await ensureExcelLibrary();
  } catch (error) {
    showToast(error.message);
    return;
  }

  const plan = state.plan;
  const workbook = XLSX.utils.book_new();
  const overviewRows = [
    ["绿钢智序 · 一厂/二厂/三厂低碳日排产计划"],
    ["计划日期", state.planDate, "计划开始", formatClock(plan.startMinute), "计划完工", formatClock(plan.endMinute)],
    [],
    ["核心指标", "结果", "单位"],
    ["计划产量", plan.totals.tons, "t"],
    ["总完工时长", toClockCode(plan.makespan), "时:分"],
    ["预计减碳", Number(plan.carbon.carbonSaved.toFixed(1)), "tCO2e"],
    ["减排比例", `${fmt(plan.carbon.carbonReductionPercent)}%`, ""],
    ["转炉废钢比", `${fmt(plan.carbon.scrapRatio, 0)}%`, ""],
    ["炉次数", plan.totals.heats, "炉"],
    ["工序数", plan.tasks.length, "道"],
    ["平均工序等待", Math.round(plan.totals.averageWait), "min"],
    [],
    ["设备配套", "炼钢设备", "精炼设备", "连铸设备"],
    ["一厂", "2×100t 顶底复吹转炉", "2座吹氩站 + 1座DV炉", "1台8机8流 + 2台5机5流"],
    ["二厂", "3×250t 顶底复吹转炉", "2台RH + 2台LF + 2座吹氩站", "3台双流板坯连铸机"]
    ["三厂", "2×180t 转炉", "1台RH + 1台LF", "1台1600mm宽板坯连铸机"],
    [],
    ["说明", "碳排数据为比赛演示场景测算，生产应用需替换为企业实测碳因子。"],
  ];
  const overview = XLSX.utils.aoa_to_sheet(overviewRows);
  overview["!merges"] = [XLSX.utils.decode_range("A1:D1"), XLSX.utils.decode_range("A19:D19")];
  overview["!cols"] = [{ wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(workbook, overview, "总览");

  const heatRows = [[
    "日期", "炉次", "工厂", "路线", "钢种", "单炉吨数",
    "炼钢设备", "炼钢开始", "炼钢结束",
    "精炼设备", "精炼开始", "精炼结束",
    "连铸设备", "连铸开始", "连铸结束", "等待(min)",
  ]];
  for (const heat of plan.heatPlans) {
    const steel = taskFor(heat, "STEEL");
    const refine = taskFor(heat, "REFINE");
    const cast = taskFor(heat, "CAST");
    heatRows.push([
      state.planDate, heat.heatId, `${heat.plant}厂`, heat.route, heat.grade, heat.tons,
      steel.equipmentId, formatClock(steel.start), formatClock(steel.end),
      refine.equipmentId, formatClock(refine.start), formatClock(refine.end),
      cast.equipmentId, formatClock(cast.start), formatClock(cast.end), heat.totalWait,
    ]);
  }
  const heatSheet = XLSX.utils.aoa_to_sheet(heatRows);
  heatSheet["!cols"] = [12, 18, 9, 9, 12, 11, 16, 11, 11, 16, 11, 11, 16, 11, 11, 11].map((wch) => ({ wch }));
  heatSheet["!autofilter"] = { ref: `A1:P${heatRows.length}` };
  XLSX.utils.book_append_sheet(workbook, heatSheet, "炉次时序");

  const taskRows = [[
    "工厂", "炉次", "订单", "工序", "设备", "开始时间", "结束时间", "时长(min)", "钢种", "炉重(t)",
  ]];
  for (const task of [...plan.tasks].sort((a, b) => a.plant - b.plant || a.start - b.start)) {
    taskRows.push([
      `${task.plant}厂`, task.heatId, task.orderId, task.stageLabel, task.equipmentId,
      formatClock(task.start), formatClock(task.end), task.duration, task.grade, task.tons,
    ]);
  }
  const taskSheet = XLSX.utils.aoa_to_sheet(taskRows);
  taskSheet["!cols"] = [9, 18, 14, 10, 16, 11, 11, 11, 12, 11].map((wch) => ({ wch }));
  taskSheet["!autofilter"] = { ref: `A1:J${taskRows.length}` };
  XLSX.utils.book_append_sheet(workbook, taskSheet, "工序明细");

  const equipmentRows = [["工厂", "设备ID", "设备名称", "任务数", "忙碌时长(min)", "负荷率"]];
  for (const unit of plan.equipmentSummary) {
    equipmentRows.push([
      `${unit.id.slice(1, 2)}厂`, unit.id, unit.label, unit.taskCount, unit.busyMinutes,
      `${fmt(unit.utilization * 100)}%`,
    ]);
  }
  const equipmentSheet = XLSX.utils.aoa_to_sheet(equipmentRows);
  equipmentSheet["!cols"] = [9, 16, 18, 10, 16, 12].map((wch) => ({ wch }));
  equipmentSheet["!autofilter"] = { ref: `A1:F${equipmentRows.length}` };
  XLSX.utils.book_append_sheet(workbook, equipmentSheet, "设备负荷");

  const carbonRows = [
    ["减碳核算", "数值", "说明"],
    ["计划总产量(t)", plan.totals.tons, "当日炉次合计"],
    ["转炉钢产量(t)", plan.totals.bofTons, "BOF 路线"],
    ["计划炉次", plan.totals.heats, "炉"],
    ["转炉废钢比", `${fmt(plan.carbon.scrapRatio, 0)}%`, "演示输入参数"],
    ["常规基准碳强度(tCO2/t)", plan.carbon.baselineIntensity, "基准情景"],
    ["低碳转炉碳强度(tCO2/t)", Number(plan.carbon.bofIntensity.toFixed(2)), "按废钢比折算"],
    ["常规基准碳排放(tCO2e)", Number(plan.carbon.baselineCarbon.toFixed(1)), "总产量 × 基准强度"],
    ["本方案碳排放(tCO2e)", Number(plan.carbon.scheduledCarbon.toFixed(1)), "分路线加权"],
    ["日减碳量(tCO2e)", Number(plan.carbon.carbonSaved.toFixed(1)), "基准排放 - 本方案排放"],
    ["减排比例", `${fmt(plan.carbon.carbonReductionPercent)}%`, "日减碳量 / 基准排放"],
    ["吨钢碳排(tCO2/t)", Number((plan.carbon.scheduledCarbon / plan.totals.tons).toFixed(2)), "本方案碳排放 / 总产量"],
  ];
  const carbonSheet = XLSX.utils.aoa_to_sheet(carbonRows);
  carbonSheet["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, carbonSheet, "减碳核算");

  XLSX.writeFile(workbook, `绿钢智序_${state.planDate}_三厂日排产计划.xlsx`, { compression: true });
  showToast("Excel 排产计划已导出");
}
function snapshotOrders() {
  try {
    state.orders = readOrdersFromTable();
  } catch {
    // Ignore transient invalid values while the user is editing.
  }
}

$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const account = $("#account").value.trim();
  const password = $("#password").value;
  if (!account || !password) {
    setLoginError("请输入账号和密码");
    return;
  }
  if (account !== AUTH.account || password !== AUTH.password) {
    setLoginError("账号或密码不正确，请核对赛事演示凭证");
    $("#password").select();
    return;
  }
  setLoginError("");
  openApp({ remember: true });
});

$("#toggle-password").addEventListener("click", () => {
  const input = $("#password");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  $("#toggle-password").textContent = showing ? "显示" : "隐藏";
  $("#toggle-password").setAttribute("aria-label", showing ? "显示密码" : "隐藏密码");
  input.focus();
});

$("#logout-button").addEventListener("click", closeApp);

$$("[data-slide-target]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    goToSlide(Number(button.dataset.slideTarget));
  });
});
$("#prev-slide").addEventListener("click", () => goToSlide(slideIndex - 1));
$("#next-slide").addEventListener("click", () => goToSlide(slideIndex + 1));

document.addEventListener("keydown", (event) => {
  if ($("#app-shell").hidden || isEditingTarget(event.target)) return;
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    goToSlide(slideIndex - 1);
  }
  if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault();
    goToSlide(slideIndex + 1);
  }
  if (event.key === "Home") {
    event.preventDefault();
    goToSlide(0);
  }
  if (event.key === "End") {
    event.preventDefault();
    goToSlide(slideNames.length - 1);
  }
});

let swipeStartX = null;
$("#deck-main").addEventListener("pointerdown", (event) => {
  if (event.target.closest(".gantt-scroller, .table-shell, input, select, button, textarea")) return;
  swipeStartX = event.clientX;
});
$("#deck-main").addEventListener("pointerup", (event) => {
  if (swipeStartX == null) return;
  const distance = event.clientX - swipeStartX;
  swipeStartX = null;
  if (Math.abs(distance) < 70) return;
  goToSlide(slideIndex + (distance < 0 ? 1 : -1));
});
$("#deck-main").addEventListener("pointercancel", () => { swipeStartX = null; });

$("#add-order").addEventListener("click", () => {
  snapshotOrders();
  addOrder();
});
$("#demand-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  snapshotOrders();
  removeOrder(Number(button.dataset.removeIndex));
});
$("#run-schedule").addEventListener("click", () => runSchedule({ animate: true }));
$("#reset-demo").addEventListener("click", resetDemo);
$("#export-xlsx").addEventListener("click", exportExcel);
$("#download-template").addEventListener("click", downloadPlanTemplate);
$("#import-excel-button").addEventListener("click", () => $("#import-excel").click());
$("#import-excel").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  await importPlanFromExcel(file);
  event.target.value = "";
});
$$("[data-gantt-plant]").forEach((button) => {
  button.addEventListener("click", () => {
    state.ganttPlant = Number(button.dataset.ganttPlant);
    if (state.plan) renderGantt(state.plan);
  });
});
$("#scrap-ratio").addEventListener("input", (event) => {
  $("#scrap-output").value = event.target.value;
});
$("#plan-date").addEventListener("change", (event) => {
  state.planDate = event.target.value || state.planDate;
  updateHeroDate(state.planDate);
});

if (trySessionRead()) {
  openApp({ remember: false });
} else {
  $("#account").focus();
}
















