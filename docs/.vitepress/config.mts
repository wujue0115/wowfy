import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Wowfy",
  description: "An awesome and easy-to-use JavaScript animation library.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Effects", link: "/guide/effects/ripple" }
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Installation", link: "/guide/installation" },
          { text: "Usage", link: "/guide/usage" }
        ]
      },
      {
        text: "Effects",
        items: [{ text: "Ripple", link: "/effects/ripple" }]
      }
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/wujue0115/wowfy" }
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2023-PRESENT Wujue"
    }
  },
  srcDir: "./src",
  base: "/wowfy/"
});
