import parser from "cron-parser";

const CRON_MACROS: Record<string, string | null> = {
  "@yearly": "0 0 0 1 1 *",
  "@annually": "0 0 0 1 1 *",
  "@monthly": "0 0 0 1 * *",
  "@weekly": "0 0 0 * * 0",
  "@daily": "0 0 0 * * *",
  "@midnight": "0 0 0 * * *",
  "@hourly": null,
  "@minutely": null,
  "@secondly": null,
};

function normalizeTime(time: string) {
  const parts = String(time || "").trim().split(/\s+/);
  if (parts.length !== 3 || parts.some(part => !/^\d+$/.test(part))) {
    throw new Error(`随机时间格式错误：${time}`);
  }
  const [second, minute, hour] = parts.map(Number);
  if (second > 59 || minute > 59 || hour > 23) {
    throw new Error(`随机时间超出范围：${time}`);
  }
  return [second, minute, hour].map(String) as [string, string, string];
}

function normalizeCron(cron: string) {
  const value = String(cron || "").trim();
  if (!value) {
    throw new Error("定时触发器缺少Cron表达式，无法安全保留原调度规则");
  }
  const macroKey = value.toLowerCase();
  if (macroKey.startsWith("@")) {
    if (!(macroKey in CRON_MACROS)) {
      throw new Error(`不支持的Cron宏表达式：${value}`);
    }
    const expanded = CRON_MACROS[macroKey];
    if (!expanded) {
      throw new Error(`Cron宏表达式 ${value} 不适用于每日随机时间`);
    }
    return expanded;
  }
  const parts = value.split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    throw new Error(`不支持的Cron格式（仅支持5或6字段）：${value}`);
  }
  try {
    parser.parseExpression(parts.length === 6 ? parts.join(" ") : parts.join(" "));
  } catch (e) {
    throw new Error(`Cron表达式无效：${value}`);
  }
  return parts.join(" ");
}

/**
 * 只替换cron的秒/分/时，保留原有的日、月、周等调度参数。
 * 无法安全识别的表达式会抛错，不会静默改成每日任务。
 */
export function replaceCronTime(cron: string, time: string) {
  const [second, minute, hour] = normalizeTime(time);
  const normalizedCron = normalizeCron(cron);
  const parts = normalizedCron.split(" ");
  if (parts.length === 6) {
    return [second, minute, hour, ...parts.slice(3)].join(" ");
  }
  // 5字段cron不支持秒，保留分/时和日期参数
  return [minute, hour, ...parts.slice(2)].join(" ");
}

/**
 * 保留所有非timer触发器；存在timer时修改其时间，不存在timer时才新增每日timer。
 * 多个timer统一使用同一个随机时间，但保留各自的日期规则。
 */
export function applyRandomTimeToTriggers(triggers: any[], time: string, newTimerId: string) {
  const list = Array.isArray(triggers) ? triggers : [];
  const timerExists = list.some(item => item?.type === "timer");
  if (!timerExists) {
    return [
      ...list,
      {
        id: newTimerId,
        title: "定时触发",
        type: "timer",
        props: { cron: replaceCronTime("0 0 0 * * *", time) },
      },
    ];
  }
  return list.map(item => {
    if (item?.type !== "timer") {
      return item;
    }
    return {
      ...item,
      props: {
        ...item.props,
        cron: replaceCronTime(item?.props?.cron, time),
      },
    };
  });
}
