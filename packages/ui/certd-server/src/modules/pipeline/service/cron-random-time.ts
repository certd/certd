/**
 * 只替换cron的秒/分/时，保留原有的日、月、周等调度参数。
 * 6字段: 秒 分 时 日 月 周；5字段: 分 时 日 月 周。
 */
export function replaceCronTime(cron: string, time: string) {
  const timeParts = String(time || "").trim().split(/\s+/);
  if (timeParts.length !== 3 || timeParts.some(part => !/^\d+$/.test(part))) {
    throw new Error(`随机时间格式错误：${time}`);
  }
  const [second, minute, hour] = timeParts;
  const parts = String(cron || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 6) {
    return [second, minute, hour, ...parts.slice(3)].join(" ");
  }
  if (parts.length === 5) {
    // 5字段cron不支持秒，保留分/时和日期参数
    return [minute, hour, ...parts.slice(2)].join(" ");
  }
  return `${second} ${minute} ${hour} * * *`;
}
