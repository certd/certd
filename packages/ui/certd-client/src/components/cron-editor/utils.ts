import parser from "cron-parser";
import dayjs from "dayjs";

export function getCronNextTimes(cron: string, count: number = 1) {
  if (cron == null) {
    return [];
  }
  const nextTimes = [];
  const interval = parser.parseExpression(cron);
  for (let i = 0; i < count; i++) {
    const next = interval.next().getTime();
    nextTimes.push(dayjs(next).valueOf());
  }
  return nextTimes;
}
