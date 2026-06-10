<script setup>
import { computed } from 'vue'

const props = defineProps({
  min: {
    type: Number,
    default: 0
  },
  max: {
    type: Number,
    default: 100
  },
  step: {
    type: Number,
    default: 1
  },
  modelValue: {
    type: Array,
    default: () => [0, 100]
  }
})

const emit = defineEmits(['update:modelValue'])

const localMin = computed(() => props.modelValue[0])
const localMax = computed(() => props.modelValue[1])

function onMinInput(e) {
  const val = Number(e.target.value)
  const clamped = Math.min(val, localMax.value - props.step)
  emit('update:modelValue', [clamped, localMax.value])
}

function onMaxInput(e) {
  const val = Number(e.target.value)
  const clamped = Math.max(val, localMin.value + props.step)
  emit('update:modelValue', [localMin.value, clamped])
}

const rangeStyle = computed(() => {
  const total = props.max - props.min
  const left = ((localMin.value - props.min) / total) * 100
  const right = ((props.max - localMax.value) / total) * 100
  return { left: `${left}%`, right: `${right}%` }
})
</script>

<template>
  <div class="relative h-6 flex items-center">
    <!-- 背景轨道 -->
    <div class="absolute w-full h-1.5 rounded-full bg-neutral-200"></div>
    <!-- 选中范围高亮 -->
    <div class="absolute h-1.5 rounded-full bg-neutral-900" :style="rangeStyle"></div>
    <!-- 最小值滑块 -->
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="localMin"
      @input="onMinInput"
      class="dual-range-input"
      :style="{ zIndex: localMin >= localMax ? 5 : 3 }"
    />
    <!-- 最大值滑块 -->
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="localMax"
      @input="onMaxInput"
      class="dual-range-input"
      :style="{ zIndex: localMax <= localMin ? 5 : 4 }"
    />
  </div>
</template>

<style scoped>
.dual-range-input {
  position: absolute;
  width: 100%;
  height: 1.5rem;
  background: none;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  padding: 0;
  transform: translateY(-5px);
}

.dual-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 2px solid #171717;
  cursor: pointer;
  pointer-events: all;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.dual-range-input::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.dual-range-input::-webkit-slider-thumb:active {
  transform: scale(1.1);
  border-width: 3px;
}

.dual-range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 2px solid #171717;
  cursor: pointer;
  pointer-events: all;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.dual-range-input::-webkit-slider-runnable-track {
  height: 6px;
  background: transparent;
  border-radius: 9999px;
}

.dual-range-input::-moz-range-track {
  height: 6px;
  background: transparent;
  border-radius: 9999px;
}
</style>
