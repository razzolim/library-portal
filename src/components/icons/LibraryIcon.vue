<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel"
    role="img"
    class="library-icon"
  >
    <path d="M12 6c-3-2-6-2-8 0v10c2-2 5-2 8 0" />
    <path d="M12 6c3-2 6-2 8 0v10c-2-2-5-2-8 0" />
    <path d="M12 6v10" />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [String, Number],
    default: 24
  },
  ariaLabel: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.library-icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
