import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');
dayjs.extend(utc);
dayjs.extend(relativeTime);

type formatType = 'zh-cn' | 'mormal';

/**
 * 格式化时间
 * @param {array} time 时间
 * @param {formatType} type 格式化类型
 * @returns 格式化后的时间
 */
export default function timeFormat(time?: string, type: formatType = 'zh-cn') {
  if (type === 'zh-cn') {
    return dayjs(time).fromNow();
  } else {
    return formatUtcString(time);
  }
}

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
function formatUtcString(utcString?: string, format: string = DATE_TIME_FORMAT) {
  return dayjs.utc(utcString).utcOffset(8).format(format);
}
