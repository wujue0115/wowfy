---
outline: deep
---

:::tip NOTICE
If you haven't read the installation tutorial yet, please go to the [Installation](./installation.md).
:::

# Usage

Before we begin, let's provide a quick overview. Wowfy offers a variety of impressive effects to enhance your web projects. You can easily adjust how these effects appear by configuring options. Don't wait—let's quickly customize your own effects for a more appealing look!

## In HTML tag

After Wowfy initialization, you can quickly configure effects within HTML tags.

**Here are some concise guidelines:**
- All attributes related to Wowfy within HTML tags are prefixed with "w-".
- All attributes should be `kebab-cased`.
- Be sure to set the effect attribute.
- Each effect attribute provides different option attributes; make sure not to use option attributes that are not provided by the specific effect.
- Please do not set attributes repeatedly in HTML tags.

### Example
Follow these steps to easily apply an effect. 

First, choose your preferred effect, and add it to the target tag (in our example, we select the "ripple" effect).

```html:line-numbers
<div w-ripple> // [!code hl]
  Wowfy
</div>
```

Next, set the option attributes related to the 'ripple' effect (you can find more details in the [Ripple option](/effects/ripple#option)).

```html:line-numbers
<div 
  w-ripple
  w-duration="1s" // [!code hl]
  w-background="#fa0" // [!code hl]
>
  Wowfy
</div>
```

:::info The default value of option attribute
Every option attribute has default values. If you don't set the attributes, the default settings will be applied.
:::

## In JavaScript

Using JavaScript to configure effect provides you with the flexibility to customize styles and create more intricate visual effects.

You can use the Wowfy class to bind HTML element and configure effect. The Wowfy constructor takes three parameters: the first one is the target HTML element, the second one is the target element's effect, and the third one is the effect's option. As shown in the example below:

```js:line-numbers
const wowfy = new Wowfy(/* element */, /* effect */, /* option */);
```

### Example

If you are using the Global import method, you can directly use the Wowfy class within the script tag.

:::tip NOTICE
It's important to note that when specifying attributes inside the third parameter (option), you should use the `camelCase` naming convention for those attributes.
:::

```html:line-numbers
<html>
  <head>
    ...
    <script src="/dist/wowfy.global.js"></script> // [!code hl]
    ...
  </head>
  <body>
    ...
    <div class="btn">
      Wowfy
    </div>
    ...
    <script>
      const btn = document.querySelector(".btn"); // [!code hl]
      const wowfyBtn = new Wowfy(btn, "ripple", { // [!code hl]
        duration: "1s", // [!code hl]
        background: "#fffa", // [!code hl]
      }); // [!code hl]
    </script>
  </body>
</html>
```

If you are using the ES Module import method, please import the Wowfy class, as shown in line 20.

```html:line-numbers
<html>
  <head>
    ...
    <script type="importmap"> // [!code hl]
      { // [!code hl]
        "imports": { // [!code hl]
          "wowfy": "/dist/wowfy.esm-browser.js" // [!code hl]
        } // [!code hl]
      } // [!code hl]
    </script> // [!code hl]
    ...
  </head>
  <body>
    ...
    <div class="btn">
      Wowfy
    </div>
    ...
    <script type="module">
      import { Wowfy } from "wowfy"; // [!code hl]

      const btn = document.querySelector(".btn"); // [!code hl]
      const wowfyBtn = new Wowfy(btn, "ripple", { // [!code hl]
        duration: "1s", // [!code hl]
        background: "#fffa", // [!code hl]
      }); // [!code hl]
    </script>
  </body>
</html>
```

## In Vue SFC

:::info
The following examples are all used within Vue 3 [Composition API](https://vuejs.org/guide/extras/composition-api-faq.html).
:::

You can import the required functions or classes in SFC ([Single File Component](https://vuejs.org/guide/scaling-up/sfc.html)) as shown in the 6th line after installing Wowfy using a package manager.

```vue:line-numbers
<template>
...
</template>

<script setup>
import { onMounted } from 'vue' // [!code hl]
import { Wowfy, wowfyInit } from "wowfy"; // [!code hl]
...
</script>

<style scoped>
... 
</style>
```

Next, whether you want to set up an effect using an HTML tag or JavaScript, you must wait until the DOM tree is fully created before you can operate on it. Therefore, any configuration for Wowfy needs to be done within the Vue 3 Composition's [onMounted()](https://vuejs.org/api/composition-api-lifecycle.html#onmounted) function.

If you want to use it within an HTML tag, please call wowfyInit() within onMounted(). Please refer to the following lines 14-15.

```vue:line-numbers
<template>
  <div  // [!code hl]
    w-ripple // [!code hl]
    w-duration="1s" // [!code hl]
    w-background="#fa0" // [!code hl]
  > // [!code hl]
    Wowfy // [!code hl]
  </div> // [!code hl]
</template>

<script setup>
import { onMounted } from 'vue' // [!code hl]
import { wowfyInit } from "wowfy"; // [!code hl]

onMounted(() => { // [!code hl]
  wowfyInit(); // [!code hl]
}) // [!code hl]
...
</script>

<style scoped>
... 
</style>
```

If you want to operate through JavaScript, it is recommended to obtain the DOM element instance using Vue 3 [template refs](https://vuejs.org/guide/essentials/template-refs.html) after it's mounted, and then create a Wowfy instance and set the parameters. Please refer to the following example:

```vue:line-numbers
<template>
  <div ref="btnRef" class="btn"> // [!code hl]
    Wowfy // [!code hl]
  </div> // [!code hl]
</template>

<script setup>
import { ref, onMounted } from 'vue' // [!code hl]
import { Wowfy } from "wowfy"; // [!code hl]

const btnRef = ref(null) // [!code hl]

onMounted(() => { // [!code hl]
  const wowfyBtn = new Wowfy(btnRef, "ripple", { // [!code hl]
    duration: "1s", // [!code hl]
    background: "#fffa", // [!code hl]
  }); // [!code hl]
}) // [!code hl]
...
</script>

<style scoped>
... 
</style>
```