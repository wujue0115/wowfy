import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/ripple",
      name: "ripple",
      component: () => import("../views/RippleView.vue"),
    },
    {
      path: "/string-art",
      name: "string-art",
      component: () => import("../views/StringArtView.vue"),
    },
  ],
});

export default router;
