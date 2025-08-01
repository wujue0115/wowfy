<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { StringArtEffect } from "wowfy";
import { createStringArt } from "wowfy";
// import img from "@/assets/d.jpeg";
// import img from "@/assets/ee.png";
// import img from "@/assets/einstein.jpeg";
// import img from "@/assets/kiro.webp";
// import img from "@/assets/nike.webp";
// import img from "@/assets/puma.png";
// import img from "@/assets/hali.jpg";
// import img from "@/assets/lufy.jpeg";
// import img from "@/assets/x.png";
// import img from "@/assets/vue.png";
// import img from "@/assets/react2.png";
// import img from "@/assets/forever.png";
import img from "@/assets/104.jpg"; // Change this to your desired image

let stringArt: StringArtEffect;

onMounted(async () => {
  console.log(img);

  stringArt = createStringArt(".js-stringArt", {
    duration: "0.5s",
    image: img,
    points: 288,
    lines: 6000,
    lineColor: `#000000${"15"}`,
    mode: "svg",
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
  width: 660px;
  aspect-ratio: 1;
  border: 1px solid #000a;
  box-sizing: content-box;
}
</style>
