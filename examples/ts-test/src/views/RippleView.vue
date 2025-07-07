<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { RippleEffect } from "wowfy";
import { createRipple, initRipple } from "wowfy";

let destroyRipple: () => void;
let ripple: RippleEffect;

onMounted(() => {
  const { destroy } = initRipple({
    duration: "800ms",
    background: "radial-gradient(#ffe8d133, #ffe8d1)",
    boxShadow: "0 0 10px 5px #ffe8d1",
  });
  destroyRipple = destroy;

  ripple = createRipple(".js-ripple", {
    event: "mousemove",
    duration: "0.5s",
    sizeRatio: 0.15,
  });
  ripple.mount();

  const updateRippleLoop = () => {
    const r = 150 + Math.floor(Math.random() * 106);
    const g = 150 + Math.floor(Math.random() * 106);
    const b = 150 + Math.floor(Math.random() * 106);
    const alpha = 0.8;

    ripple.update({
      background: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    });

    window.requestAnimationFrame(updateRippleLoop);
  };

  updateRippleLoop();
});

onBeforeUnmount(() => {
  destroyRipple();
  ripple.destroy();
});
</script>

<template>
  <div class="wrapper">
    <div class="btn" w-ripple>Wowfy</div>
    <div
      class="btn"
      w-ripple='{
        "background": "radial-gradient(#18182533, #181825)",
        "boxShadow": "0 0 10px 5px #181825",
        "duration": "2s",
        "maxCount": "3"
      }'
      w-duration="30s"
      w-max-count="1"
    >
      Wowfy
    </div>
    <div class="btn js-ripple">Wowfy</div>
    <div class="btn js-ripple">Wowfy</div>
  </div>
</template>

<style scoped>
.wrapper {
  height: 100vh;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  background: #181825;
}

.btn {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0.5rem;
  width: 20%;
  min-width: 200px;
  aspect-ratio: 1;
  border-radius: 10px;
  box-shadow: 0 0 3px #fff;
  background: #fff3;
  color: #fff;
  text-shadow: 0 0 3px #fff;
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 0.25em;
  transition: 0.3s;
  cursor: pointer;

  &:not(.js-ripple) {
    &:hover {
      scale: 1.02;
    }

    &:active {
      scale: 1;
    }
  }
}
</style>
