import { defineStore } from 'pinia';
import { getUserHistory, deleteHistory, clearUserHistory, addHistory } from '@/service/history/history.request';
import { Msg, dateFormat } from '@/utils';
import type { RouteParam } from '@/service/types';
import type { IHistoryItem, IHistoryState } from '@/stores/types/history.result';
export const useHistoryStore = defineStore('history', {
  state: (): IHistoryState => ({
    historyList: [],
    total: 0,
    pageNum: 1,
    pageSize: 20,
    loading: false,
  }),

  getters: {
    hasMore(): boolean {
      return this.historyList.length < this.total;
    },
  },

  actions: {
    // 添加浏览记录
    async addHistoryAction(articleId?: RouteParam) {
      try {
        const res = await addHistory(articleId);
        if (res.code === 0) {
          console.log('添加浏览记录成功');
        } else {
          console.log('添加浏览记录失败:', res.msg);
        }
      } catch (error) {
        console.log('添加浏览记录失败:', error);
      }
    },

    // 获取浏览历史
    async getHistoryAction(reset = false) {
      this.loading = true;
      try {
        const offset = reset ? 0 : this.historyList.length;
        const res = await getUserHistory({
          offset,
          limit: this.pageSize,
        });

        if (res.code === 0) {
          const { result, total, pageNum, pageSize } = res.data;
          if (reset) {
            this.historyList = result;
          } else {
            this.historyList.push(...result);
          }

          this.total = total;
          this.pageNum = pageNum;
          this.pageSize = pageSize;
        } else {
          Msg.showFail('获取浏览历史失败');
        }
      } catch (error) {
        Msg.showFail('获取浏览历史失败');
      } finally {
        this.loading = false;
      }
    },

    // 删除单个浏览记录
    async deleteHistoryAction(articleId?: RouteParam) {
      try {
        const res = await deleteHistory(articleId);
        if (res.code === 0) {
          // 从本地列表中移除
          this.historyList = this.historyList.filter((item: any) => item.articleId !== articleId);
          this.total = Math.max(0, this.total - 1);
          Msg.showSuccess('删除浏览记录成功');
        } else {
          Msg.showFail('删除浏览记录失败');
        }
      } catch (error) {
        Msg.showFail('删除浏览记录失败');
      }
    },

    // 清空浏览历史
    async clearHistoryAction() {
      try {
        const res = await clearUserHistory();
        if (res.code === 0) {
          this.historyList = [];
          this.total = 0;
          this.pageNum = 1;
          Msg.showSuccess('清空浏览历史成功');
        } else {
          Msg.showFail('清空浏览历史失败');
        }
      } catch (error) {
        Msg.showFail('清空浏览历史失败');
      }
    },

    // 重置状态
    resetHistory() {
      this.historyList = [];
      this.total = 0;
      this.pageNum = 1;
      this.loading = false;
    },
  },
});

export default useHistoryStore;
