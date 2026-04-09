<template>
  <div class="flow-skeleton-list">
    <div v-for="i in count ?? 3" :key="i" class="flow-skeleton-item">
      <div class="sk-header">
        <div class="sk-avatar pulse" />
        <div class="sk-meta">
          <div class="sk-name pulse" />
          <div class="sk-time pulse" />
        </div>
      </div>
      <div class="sk-body">
        <div class="sk-line sk-line--full pulse" />
        <div class="sk-line sk-line--3q pulse" />
      </div>
      <div class="sk-media pulse" />
      <div class="sk-actions">
        <div class="sk-action pulse" />
        <div class="sk-action pulse" />
        <div class="sk-action pulse" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number;
}>();
</script>
<style lang="scss" scoped>
@keyframes pulse-shimmer {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.18;
  }
}

.pulse {
  animation: pulse-shimmer 1.6s ease-in-out infinite;
  background: color-mix(in oklch, var(--fontColor) 14%, transparent);
  border-radius: 6px;
}

.flow-skeleton-list {
  display: flex;
  flex-direction: column;
}

.flow-skeleton-item {
  padding: 20px 0;

  & + & {
    border-top: 1px solid color-mix(in oklch, var(--fontColor) 8%, transparent);
  }

  .sk-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;

    .sk-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .sk-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;

      .sk-name {
        width: 100px;
        height: 13px;
      }

      .sk-time {
        width: 60px;
        height: 10px;
      }
    }
  }

  .sk-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;

    .sk-line {
      height: 13px;

      &--full {
        width: 100%;
      }

      &--3q {
        width: 72%;
      }
    }
  }

  .sk-media {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 12px;
  }

  .sk-actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;

    .sk-action {
      width: 56px;
      height: 28px;
      border-radius: 14px;
    }
  }
}
</style>
