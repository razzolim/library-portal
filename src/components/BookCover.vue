<template>
  <div
    class="book-cover"
    :class="`book-cover--${size}`"
    :style="{ '--cover-color': coverColor, '--title-size': titleSize }"
    aria-hidden="true"
  >
    <!--
      Decorative: every place that shows a cover also shows the title as text.
      A printed cover (title and author on the book's color) is always drawn; the
      real cover image fades in on top once it has loaded, so slow or missing
      images never leave a blank.
    -->
    <div class="book-cover__printed">
      <span class="book-cover__rule" />
      <span class="book-cover__title">{{ book.title }}</span>
      <span v-if="size !== 'sm'" class="book-cover__author">{{ book.author }}</span>
    </div>
    <img
      v-if="imageUrl && !imageFailed"
      class="book-cover__image"
      :class="{ 'book-cover__image--loaded': imageLoaded }"
      :src="imageUrl"
      alt=""
      loading="lazy"
      decoding="async"
      @load="handleLoad"
      @error="imageFailed = true"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { DEFAULT_COVER_COLOR, getCoverImageUrl } from '../utils/cover.js'

const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  }
})

// Open Library image size for each cover size.
const IMAGE_SIZES = { sm: 'S', md: 'M', lg: 'L' }

const imageFailed = ref(false)
const imageLoaded = ref(false)

const coverColor = computed(() => props.book.coverColor || DEFAULT_COVER_COLOR)
const imageUrl = computed(() => getCoverImageUrl(props.book, IMAGE_SIZES[props.size]))

// Long words ("Microservices") would break mid-word at the default size, so the
// title shrinks until its longest word fits the cover's text column (~76% wide).
const titleSize = computed(() => {
  const words = (props.book.title || '').split(/\s+/)
  const longestWord = Math.max(1, ...words.map((word) => word.length))
  return `${Math.min(10.5, 76 / (longestWord * 0.62)).toFixed(2)}cqw`
})

watch(imageUrl, () => {
  imageFailed.value = false
  imageLoaded.value = false
})

function handleLoad(event) {
  // Some cover services answer with a 1×1 placeholder instead of a 404.
  if (event.target.naturalWidth < 10) {
    imageFailed.value = true
  } else {
    imageLoaded.value = true
  }
}
</script>

<style scoped>
.book-cover {
  container-type: inline-size;
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 2px 5px 5px 2px;
  background-color: var(--cover-color);
  color: var(--color-white);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12), 0 10px 18px -12px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.book-cover--sm {
  border-radius: 2px 3px 3px 2px;
}

.book-cover__image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.book-cover__image--loaded {
  opacity: 1;
}

/* Spine shading and a faint cloth weave, so the printed cover reads as a book */
.book-cover__printed {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.3) 0, rgba(0, 0, 0, 0.1) 5%, rgba(255, 255, 255, 0.14) 6%, rgba(255, 255, 255, 0) 9%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, rgba(0, 0, 0, 0) 1px 3px);
}

.book-cover__rule {
  position: absolute;
  top: 9%;
  left: 14%;
  right: 9%;
  height: max(1px, 1.2cqw);
  background-color: rgba(255, 255, 255, 0.45);
}

.book-cover__title {
  position: absolute;
  top: 15%;
  left: 14%;
  right: 9%;
  font-size: var(--title-size, 10.5cqw);
  font-weight: 700;
  line-height: 1.1;
  text-wrap: balance;
}

.book-cover__author {
  position: absolute;
  top: 66%;
  left: 14%;
  right: 9%;
  font-size: 5.6cqw;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
}

.book-cover--sm .book-cover__title {
  top: 12%;
  font-size: calc(var(--title-size, 10.5cqw) * 1.25);
}
</style>
