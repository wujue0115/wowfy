<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { StringArtEffect } from "wowfy";
import { createStringArt } from "wowfy";
// import img from "@/assets/d.jpeg";
// import img from "@/assets/ee.png";
// import img from "@/assets/einstein.jpeg";
// import img from "@/assets/kiro.webp";
// import img from "@/assets/nike.webp";
import img from "@/assets/puma.png";

let stringArt: StringArtEffect;

onMounted(async () => {
  console.log(img);

  stringArt = createStringArt(".js-stringArt", {
    duration: "0.5s",
    // image: "https://fakeimg.pl/500x500",
    // image: "https://picsum.photos/200/300",
    image: img,
    points: 500,
    lines: 6000,
    // lines: 10,
    // lineColor: "#00000005",
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
  <!-- <img src="https://fakeimg.pl/500x500" alt="" /> -->
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
  /* border-radius: 50%; */
  box-sizing: content-box;
}
</style>
