import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');
dayjs.extend(utc);
dayjs.extend(relativeTime);

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

/**
 * 格式化时间
 * @param {array} time 时间
 * @returns 格式化后的时间
 */
export function timeFormat(time?: string) {
  return dayjs(time).fromNow();
}

export function formatUtcString(utcString?: string, format: string = DATE_TIME_FORMAT) {
  return dayjs.utc(utcString).utcOffset(8).format(format);
}
