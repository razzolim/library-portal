import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Full screen for one element (the whole reader, so its bars come along).
 * Browsers that refuse (or lack) the API simply hide the control.
 */
export function useFullscreen(elementRef) {
  const isFullscreen = ref(false)

  const canFullscreen = computed(
    () => typeof document !== 'undefined' && document.fullscreenEnabled === true
  )

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await elementRef.value?.requestFullscreen()
      }
    } catch (err) {
      // Refused (e.g. by an embedding page); the reader still works.
    }
  }

  function sync() {
    isFullscreen.value = Boolean(document.fullscreenElement)
  }

  onMounted(() => document.addEventListener('fullscreenchange', sync))
  onUnmounted(() => document.removeEventListener('fullscreenchange', sync))

  return { isFullscreen, canFullscreen, toggleFullscreen }
}
