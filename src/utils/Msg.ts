import { ElMessage } from 'element-plus';
const duration = 1500;
class Msg {
  static showSuccess(message: string) {
    return ElMessage({ message, type: 'success', duration });
  }
  static showWarn(message) {
    return ElMessage({ message, type: 'warning', duration });
  }
  static showFail(message) {
    return ElMessage({ message, type: 'error', duration });
  }
  static showInfo(message) {
    return ElMessage({ message, type: 'info', duration });
  }
}
export default Msg;
