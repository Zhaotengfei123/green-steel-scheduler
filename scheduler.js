export const PLANT_CONFIG = {
  1: {
    name: "一厂",
    shortName: "P1",
    steelmaking: [
      { id: "P1-BOF-01", label: "1# 顶底复吹转炉", type: "BOF", capacity: 100 },
      { id: "P1-BOF-02", label: "2# 顶底复吹转炉", type: "BOF", capacity: 100 },
    ],
    refining: [
      { id: "P1-ARG-01", label: "1# 钢包吹氩站", type: "ARGON", capacity: 100, duration: 25 },
      { id: "P1-ARG-02", label: "2# 钢包吹氩站", type: "ARGON", capacity: 100, duration: 25 },
      { id: "P1-DV-01", label: "DV炉", type: "DV", capacity: 100, duration: 40 },
    ],
    casting: [
      { id: "P1-CC-01", label: "8机8流方坯连铸机", type: "CC", capacity: 100, strands: 8 },
      { id: "P1-CC-02", label: "5机5流方坯连铸机", type: "CC", capacity: 100, strands: 5 },
      { id: "P1-CC-03", label: "5机5流方坯连铸机", type: "CC", capacity: 100, strands: 5 },
    ],
  },
  2: {
    name: "二厂",
    shortName: "P2",
    steelmaking: [
      { id: "P2-BOF-01", label: "1# 顶底复吹转炉", type: "BOF", capacity: 250 },
      { id: "P2-BOF-02", label: "2# 顶底复吹转炉", type: "BOF", capacity: 250 },
      { id: "P2-BOF-03", label: "3# 顶底复吹转炉", type: "BOF", capacity: 250 },
    ],
    refining: [
      { id: "P2-RH-01", label: "1# RH真空炉", type: "RH", capacity: 250, duration: 45 },
      { id: "P2-RH-02", label: "2# RH真空炉", type: "RH", capacity: 250, duration: 45 },
      { id: "P2-LF-01", label: "1# LF钢包炉", type: "LF", capacity: 250, duration: 38 },
      { id: "P2-LF-02", label: "2# LF钢包炉", type: "LF", capacity: 250, duration: 38 },
      { id: "P2-ARG-01", label: "1# 钢包吹氩站", type: "ARGON", capacity: 250, duration: 25 },
      { id: "P2-ARG-02", label: "2# 钢包吹氩站", type: "ARGON", capacity: 250, duration: 25 },
    ],
    casting: [
      { id: "P2-CC-01", label: "1# 双流板坯连铸机", type: "CC", capacity: 250, strands: 2 },
      { id: "P2-CC-02", label: "2# 双流板坯连铸机", type: "CC", capacity: 250, strands: 2 },
      { id: "P2-CC-03", label: "3# 双流板坯连铸机", type: "CC", capacity: 250, strands: 2 },
    ],
  },
  3: {
    name: "三厂",
    shortName: "P3",
    steelmaking: [
      { id: "P3-BOF-01", label: "1# 转炉", type: "BOF", capacity: 180 },
      { id: "P3-BOF-02", label: "2# 转炉", type: "BOF", capacity: 180 },
    ],
    refining: [
      { id: "P3-RH-01", label: "RH真空炉", type: "RH", capacity: 180, duration: 45 },
      { id: "P3-LF-01", label: "LF钢包炉", type: "LF", capacity: 180, duration: 38 },
    ],
    casting: [
      { id: "P3-CC-01", label: "1600mm宽板坯连铸机", type: "CC", capacity: 180, width: 1600 },
    ],
  },
};
export const STAGE_META = {
  STEEL: { label: "炼钢", order: 0 },
  REFINE: { label: "精炼", order: 1 },
  CAST: { label: "连铸", order: 2 },
};

export const DEFAULT_SETTINGS = {
  startTime: "06:00",
  scrapRatio: 26,
  steelDuration: { BOF: 42, EAF: 52 },
  refineDuration: 38,
  castDuration: 48,
  steelToRefine: 12,
  refineToCast: 15,
  equipmentGap: 8,
};

export const DEFAULT_ORDERS = [
  { id: "一厂-2401", plant: 1, grade: "Q355B", route: "BOF", refineType: "ARGON", heats: 3, heatWeight: 95, product: "方坯", dueTime: "20:00" },
  { id: "一厂-2402", plant: 1, grade: "HRB400E", route: "BOF", refineType: "DV", heats: 2, heatWeight: 95, product: "方坯", dueTime: "18:00" },
  { id: "二厂-2401", plant: 2, grade: "Q235B", route: "BOF", refineType: "RH", heats: 3, heatWeight: 240, product: "板坯", dueTime: "22:00" },
  { id: "二厂-2402", plant: 2, grade: "DC01", route: "BOF", refineType: "LF", heats: 2, heatWeight: 240, product: "板坯", dueTime: "21:00" },
  { id: "三厂-2401", plant: 3, grade: "Q345B", route: "BOF", refineType: "RH", heats: 3, heatWeight: 175, product: "宽板坯", dueTime: "22:00" },
  { id: "三厂-2402", plant: 3, grade: "SPHC", route: "BOF", refineType: "LF", heats: 2, heatWeight: 175, product: "宽板坯", dueTime: "20:00" },
];
export function toMinutes(value) {
  if (typeof value === "number") return value;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`时间格式应为 HH:mm：${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`时间超出范围：${value}`);
  return hour * 60 + minute;
}

export function formatClock(value) {
  const rounded = Math.round(value);
  const dayOffset = Math.floor(rounded / 1440);
  const withinDay = ((rounded % 1440) + 1440) % 1440;
  const hour = String(Math.floor(withinDay / 60)).padStart(2, "0");
  const minute = String(withinDay % 60).padStart(2, "0");
  return dayOffset > 0 ? `次日 ${hour}:${minute}` : `${hour}:${minute}`;
}

export function formatDuration(minutes) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest} 分钟`;
  return `${hours} 小时 ${String(rest).padStart(2, "0")} 分`;
}

export function normalizeRefineType(value) {
  const text = String(value ?? "自动").trim().toUpperCase();
  if (!text || text === "自动" || text === "AUTO") return "AUTO";
  if (text === "ARGON" || text.includes("氩")) return "ARGON";
  if (text === "DV" || text.includes("DV")) return "DV";
  if (text === "RH" || text.includes("RH")) return "RH";
  if (text === "LF" || text.includes("LF")) return "LF";
  return "AUTO";
}

export function refineTypeLabel(type) {
  return { AUTO: "自动匹配", ARGON: "钢包吹氩", DV: "DV炉", RH: "RH真空", LF: "LF钢包" }[type] || "自动匹配";
}
export function createHeats(orders) {
  return orders.flatMap((order) => {
    const count = Number(order.heats);
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`订单 ${order.id} 的炉数必须为正整数`);
    }
    if (!PLANT_CONFIG[order.plant]) {
      throw new Error(`订单 ${order.id} 的工厂不存在`);
    }
    if (!["BOF", "EAF"].includes(order.route)) {
      throw new Error(`订单 ${order.id} 的炼钢工艺必须为 BOF 或 EAF`);
    }
    return Array.from({ length: count }, (_, index) => ({
      ...order,
      heatId: `${order.id}-H${String(index + 1).padStart(2, "0")}`,
      heatIndex: index,
    }));
  });
}

function getSteelCandidates(plant, route) {
  return PLANT_CONFIG[plant].steelmaking.filter((unit) => unit.type === route);
}

function pickEarliest(candidates, earliestStart, availability, gap) {
  if (!candidates.length) throw new Error("当前工厂没有匹配的炼钢设备");
  return candidates
    .map((unit) => {
      const current = availability.get(unit.id);
      const start = current == null ? earliestStart : Math.max(earliestStart, current + gap);
      return { unit, start };
    })
    .sort((a, b) => a.start - b.start || a.unit.id.localeCompare(b.unit.id))[0];
}

function pickCaster(orderKey, candidates, earliestStart, availability, gap, preferredCasters) {
  if (!candidates.length) throw new Error("当前工厂没有可用的连铸机");
  const best = pickEarliest(candidates, earliestStart, availability, gap);
  const preferredId = preferredCasters.get(orderKey);
  const preferred = candidates.find((unit) => unit.id === preferredId);
  if (!preferred) return best;

  const current = availability.get(preferred.id);
  const preferredStart = current == null ? earliestStart : Math.max(earliestStart, current + gap);
  const continuityWindow = 25;
  return preferredStart - best.start <= continuityWindow
    ? { unit: preferred, start: preferredStart }
    : best;
}

function stageEquipment(plantConfig, taskEquipmentId) {
  const all = [
    ...plantConfig.steelmaking,
    ...plantConfig.refining,
    ...plantConfig.casting,
  ];
  return all.find((unit) => unit.id === taskEquipmentId);
}

export function schedulePlan(orders, rawSettings = {}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    steelDuration: { ...DEFAULT_SETTINGS.steelDuration, ...(rawSettings.steelDuration || {}) },
  };
  const startMinute = toMinutes(settings.startTime);
  const heats = createHeats(orders);
  if (!heats.length) throw new Error("至少需要一个排产订单");

  const availability = new Map();
  const preferredCasters = new Map();
  const tasks = [];

  for (const heat of heats) {
    const plant = PLANT_CONFIG[heat.plant];
    const heatWeight = Number(heat.heatWeight);
    const steelCandidates = getSteelCandidates(heat.plant, heat.route);
    const steelCapacity = Math.max(...steelCandidates.map((unit) => unit.capacity));
    if (!Number.isFinite(heatWeight) || heatWeight <= 0) {
      throw new Error(`炉次 ${heat.heatId} 的单炉重量无效`);
    }
    if (heatWeight > steelCapacity) {
      throw new Error(`炉次 ${heat.heatId} 的 ${heatWeight}t 超过 ${plant.name} ${heat.route} 容量 ${steelCapacity}t`);
    }
    if (heatWeight > Math.max(...plant.refining.map((unit) => unit.capacity))) {
      throw new Error(`炉次 ${heat.heatId} 超过 ${plant.name} 精炼炉容量`);
    }
    if (heatWeight > Math.max(...plant.casting.map((unit) => unit.capacity))) {
      throw new Error(`炉次 ${heat.heatId} 超过 ${plant.name} 连铸机容量`);
    }

    const steel = pickEarliest(steelCandidates, startMinute, availability, settings.equipmentGap);
    const steelDuration = settings.steelDuration[heat.route] || 45;
    const steelEnd = steel.start + steelDuration;
    availability.set(steel.unit.id, steelEnd);
    tasks.push({
      taskId: `${heat.heatId}-STEEL`,
      stage: "STEEL",
      stageLabel: STAGE_META.STEEL.label,
      plant: heat.plant,
      equipmentId: steel.unit.id,
      equipmentLabel: steel.unit.label,
      equipmentType: heat.route,
      heatId: heat.heatId,
      orderId: heat.id,
      grade: heat.grade,
      product: heat.product,
      tons: heatWeight,
      start: steel.start,
      end: steelEnd,
      duration: steelDuration,
    });

    const requestedRefine = normalizeRefineType(heat.refineType);
    const refiningCandidates = requestedRefine === "AUTO"
      ? plant.refining
      : plant.refining.filter((unit) => unit.type === requestedRefine);
    if (!refiningCandidates.length) {
      throw new Error(`订单 ${heat.id} 要求的${refineTypeLabel(requestedRefine)}设备在${plant.name}不存在`);
    }
    const refiner = pickEarliest(
      refiningCandidates,
      steelEnd + settings.steelToRefine,
      availability,
      settings.equipmentGap,
    );
    const refineDuration = refiner.unit.duration || settings.refineDuration;
    const refineEnd = refiner.start + refineDuration;
    availability.set(refiner.unit.id, refineEnd);
    tasks.push({
      taskId: `${heat.heatId}-REFINE`,
      stage: "REFINE",
      stageLabel: STAGE_META.REFINE.label,
      plant: heat.plant,
      equipmentId: refiner.unit.id,
      equipmentLabel: refiner.unit.label,
      equipmentType: refiner.unit.type,
      heatId: heat.heatId,
      orderId: heat.id,
      grade: heat.grade,
      product: heat.product,
      tons: heatWeight,
      start: refiner.start,
      end: refineEnd,
      duration: refineDuration,
    });

    const orderKey = `${heat.plant}-${heat.id}`;
    const caster = pickCaster(
      orderKey,
      plant.casting,
      refineEnd + settings.refineToCast,
      availability,
      settings.equipmentGap,
      preferredCasters,
    );
    if (!preferredCasters.has(orderKey)) preferredCasters.set(orderKey, caster.unit.id);
    const castEnd = caster.start + settings.castDuration;
    availability.set(caster.unit.id, castEnd);
    tasks.push({
      taskId: `${heat.heatId}-CAST`,
      stage: "CAST",
      stageLabel: STAGE_META.CAST.label,
      plant: heat.plant,
      equipmentId: caster.unit.id,
      equipmentLabel: caster.unit.label,
      equipmentType: "CC",
      heatId: heat.heatId,
      orderId: heat.id,
      grade: heat.grade,
      product: heat.product,
      tons: heatWeight,
      start: caster.start,
      end: castEnd,
      duration: settings.castDuration,
    });
  }

  const scheduleStart = Math.min(...tasks.map((task) => task.start));
  const scheduleEnd = Math.max(...tasks.map((task) => task.end));
  const makespan = scheduleEnd - scheduleStart;
  const byHeat = new Map();
  for (const task of tasks) {
    const entry = byHeat.get(task.heatId) || [];
    entry.push(task);
    byHeat.set(task.heatId, entry);
  }

  const heatPlans = [...byHeat.entries()].map(([heatId, heatTasks]) => {
    const sorted = heatTasks.sort((a, b) => STAGE_META[a.stage].order - STAGE_META[b.stage].order);
    const waits = [];
    for (let index = 1; index < sorted.length; index += 1) {
      waits.push(sorted[index].start - sorted[index - 1].end);
    }
    return {
      heatId,
      plant: sorted[0].plant,
      orderId: sorted[0].orderId,
      grade: sorted[0].grade,
      product: sorted[0].product,
      tons: sorted[0].tons,
      route: sorted[0].equipmentType,
      tasks: sorted,
      start: sorted[0].start,
      end: sorted.at(-1).end,
      waits,
      totalWait: waits.reduce((sum, value) => sum + value, 0),
    };
  }).sort((a, b) => a.plant - b.plant || a.start - b.start);

  const allEquipment = Object.values(PLANT_CONFIG).flatMap((plant) => [
    ...plant.steelmaking,
    ...plant.refining,
    ...plant.casting,
  ]);
  const equipmentSummary = allEquipment.map((unit) => {
    const unitTasks = tasks.filter((task) => task.equipmentId === unit.id);
    const busy = unitTasks.reduce((sum, task) => sum + task.duration, 0);
    return {
      ...unit,
      taskCount: unitTasks.length,
      busyMinutes: busy,
      utilization: makespan ? busy / makespan : 0,
    };
  });
  const bottleneck = [...equipmentSummary]
    .filter((unit) => unit.taskCount > 0)
    .sort((a, b) => b.utilization - a.utilization)[0];

  const totalTons = heatPlans.reduce((sum, heat) => sum + heat.tons, 0);
  const bofTons = heatPlans.filter((heat) => heat.route === "BOF").reduce((sum, heat) => sum + heat.tons, 0);
  const eafTons = totalTons - bofTons;
  const scrapRatio = Number(settings.scrapRatio);
  const bofIntensity = Math.max(1.88, 2.1 - Math.max(0, scrapRatio - 20) * 0.012);
  const eafIntensity = 0.42;
  const baselineIntensity = 2.1;
  const baselineCarbon = totalTons * baselineIntensity;
  const scheduledCarbon = bofTons * bofIntensity + eafTons * eafIntensity;
  const carbonSaved = Math.max(0, baselineCarbon - scheduledCarbon);
  const carbonReductionPercent = baselineCarbon ? (carbonSaved / baselineCarbon) * 100 : 0;
  const totalWait = heatPlans.reduce((sum, heat) => sum + heat.totalWait, 0);
  const averageWait = heatPlans.length ? totalWait / heatPlans.length : 0;

  return {
    settings,
    startMinute: scheduleStart,
    endMinute: scheduleEnd,
    makespan,
    heatPlans,
    tasks,
    equipmentSummary,
    bottleneck,
    totals: {
      heats: heatPlans.length,
      orders: new Set(heatPlans.map((heat) => `${heat.plant}-${heat.orderId}`)).size,
      tons: totalTons,
      bofTons,
      eafTons,
      eafShare: totalTons ? (eafTons / totalTons) * 100 : 0,
      totalWait,
      averageWait,
    },
    carbon: {
      baselineCarbon,
      scheduledCarbon,
      carbonSaved,
      carbonReductionPercent,
      baselineIntensity,
      bofIntensity,
      eafIntensity,
      scrapRatio,
    },
  };
}

export function planToCsv(plan, date = "") {
  const header = [
    "日期",
    "工厂",
    "订单",
    "炉次",
    "钢种",
    "产品",
    "工艺路线",
    "工序",
    "设备",
    "开始时间",
    "结束时间",
    "时长(分钟)",
    "炉重(吨)",
  ];
  const rows = [...plan.tasks]
    .sort((a, b) => a.plant - b.plant || a.start - b.start || a.stage.localeCompare(b.stage))
    .map((task) => [
      date,
      `${task.plant}厂`,
      task.orderId,
      task.heatId,
      task.grade,
      task.product,
      task.equipmentType,
      task.stageLabel,
      `${task.equipmentId} ${task.equipmentLabel}`,
      formatClock(task.start),
      formatClock(task.end),
      task.duration,
      task.tons,
    ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
}





