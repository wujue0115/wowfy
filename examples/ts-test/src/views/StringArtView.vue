<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { StringArtEffect } from "wowfy";
import { createStringArt } from "wowfy";
import img from "@/assets/d.jpeg";

let stringArt: StringArtEffect;

onMounted(async () => {
  console.log(img);

  stringArt = createStringArt(".js-stringArt", {
    duration: "0.5s",
    image: "https://fakeimg.pl/500x500",
    // image: img,
    points: 100,
    // lines: 5 * 1e4,
    lines: 1,
    // lineColor: "#00000005",
    lineColor: "#00000005",
  });
  stringArt.mount();
  await stringArt.start();

  console.log("finished");
});

onBeforeUnmount(() => {
  stringArt.destroy();
});
</script>

<template>
  <div class="wrapper">
    <div class="box js-stringArt"></div>
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
  background-color: #fff;
}

.box {
  width: 500px;
  aspect-ratio: 1;
  border: 1px solid #000a;
  /* border-radius: 50%; */
  box-sizing: content-box;
}
</style>
