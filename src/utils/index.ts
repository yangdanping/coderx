import LocalCache from './LocalCache';
import { timeFormat, formatUtcString } from './dateFormat';
import debounce from './debounce';
import isEmptyObj from './isEmptyObj';
import emitter from './eventBus';
import Msg from './Msg';
export const isArrEqual = (arr1, arr2) => arr1.length === arr2.length && arr1.every((ele) => arr2.includes(ele));
export { LocalCache, Msg, timeFormat, formatUtcString, debounce, isEmptyObj, emitter };
