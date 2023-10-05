---
outline: deep
---

# Installation

Wowfy provides flexibility in installation by offering both CDN and NPM options. You can choose the method that best fits your specific development environment and requirements.

## Installing from CDN

In the CDN installation selection, you have the choice between the Global or ES Module import methods.

### Using the Global Build

The Global import method is as follows:

```html:line-numbers
<html>
  <head>
    ...
    <script src="/dist/wowfy.global.js"></script> // [!code hl]
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

:::tip
The Global import method will automatically execute Wowfy's initialization function when it detects that the DOM tree has been constructed. Therefore, you don't need to place the script tag under all HTML tags within the body tag.
:::

#### Usage example

After completing the import, you can quickly and conveniently use Wowfy's provided animation effects within HTML tags (for more details, please refer to the effects).

The simple usage of the "ripple" effect is demonstrated in lines 9-11 below:

```html:line-numbers {9-11}
<html>
  <head>
    ...
    <script src="/dist/wowfy.global.js"></script>
    ...
  </head>
  <body>
    <div 
      w-ripple
      w-duration="1s"
      w-background="#fff"
    >
      Click
    </div>
  </body>
</html>
```

### Using the ES Module Build

The ES Module import method requires setting `type="module"` inside the script tag and using "import" to import the functions or classes you want to use.

The ES Module import method is as follows:

```html:line-numbers
<html>
  <head>
    ...
  </head>
  <body>
    ...
    <script type="module">
      import { wowfyInit } from "/dist/wowfy.esm-browser.js"; // [!code hl]

      wowfyInit(); // [!code hl]
    </script>
  </body>
</html>
```

:::warning
When using the ES Module import method, please position the script tag under all HTML tags within the body tag. If you intend to utilize Wowfy's provided attributes within HTML tags, it's essential to import "wowfyInit" and invoke the Wowfy initialization function.
:::

#### Usage example

After importing "wowfyInit" function and setting up Wowfy initialization, you can employ Wowfy's provided attributes within HTML tags, as exemplified below:

```html:line-numbers {7-9}
<html>
  <head>
    ...
  </head>
  <body>
    <div 
      w-ripple
      w-duration="1s"
      w-background="#fff"
    >
      Click
    </div>
    ...
    <script type="module">
      import { wowfyInit } from "/dist/wowfy.esm-browser.js";

      wowfyInit();
    </script>
  </body>
</html>
```

#### Importing using Import Maps

This is another way to import ES Modules. [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) provide a convenient method for managing module imports by specifying mappings between module names and their corresponding URLs.

```html:line-numbers {4-10}
<html>
  <head>
    ...
    <script type="importmap">
      {
        "imports": {
          "wowfy": "/dist/wowfy.esm-browser.js"
        }
      }
    </script>
    ...
  </head>
  <body>
    ...
    <script type="module">
      import { wowfyInit } from "wowfy"; // [!code hl]

      wowfyInit();
    </script>
  </body>
</html>
```


## Installing from NPM

You can install Wowfy using package managers like npm, yarn, or pnpm.

::: code-group
```bash [npm]
npm install wowfy
```

```bash [yarn]
yarn add wowfy
```

```bash [pnpm]
pnpm install wowfy
```
:::


