# wowfy.js

> Wowfy is a JavaScript animation library for applying a wide range of fascinating, amazing, and eye-catching effects, enhancing the visual appeal of your web projects. It is implemented using JavaScript to create various magical CSS effects and offers user-friendly options for adjusting the effects.

## Demo

[Ripple Demo](https://codepen.io/virrkfus-the-looper/pen/abXZwKv)

## Documentation

Please follow the documentation at [wowfyjs.com](https://wowfyjs.com/)

## Installation

### Installing from CDN

In the CDN installation selection, you have the choice between the Global or ES Module import methods.

#### Using the Global Build

The Global import method is as follows:

```html
<html>
  <head>
    ...
    <script src="https://unpkg.com/wowfy/dist/wowfy.global.js"></script>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

#### Using the ES Module Build

The ES Module import method requires setting `type="module"` inside the script tag and using "import" to import the functions or classes you want to use.

The ES Module import method is as follows:

```html
<html>
  <head>
    ...
  </head>
  <body>
    ...
    <script type="module">
      import { wowfyInit } from "https://unpkg.com/wowfy/dist/wowfy.mjs";

      wowfyInit();
    </script>
  </body>
</html>
```

### Installing from NPM

You can install Wowfy using package managers like npm, yarn, or pnpm.

#### npm
```bash
npm install wowfy
```
#### yarn
```bash
yarn add wowfy
```
#### pnpm
```bash
pnpm install wowfy
```

## Usage

### In HTML tag

```html
<html>
  <head>
    ...
    <script src="https://unpkg.com/wowfy/dist/wowfy.global.js"></script>
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

### In JavaScript

```html
<html>
  <head>
    ...
    <script src="https://unpkg.com/wowfy/dist/wowfy.global.js"></script>
    ...
  </head>
  <body>
    ...
    <div class="btn">
      Wowfy
    </div>
    ...
    <script>
      const btn = document.querySelector(".btn");
      const wow = new Wowfy(btn, "ripple", {
        duration: "1s",
        background: "#fffa",
      });
    </script>
  </body>
</html>
```

For more usage, please refer to the [documentation](https://wowfyjs.com/guide/usage.html).

## License
[MIT](https://github.com/wujue0115/wowfy/blob/main/LICENSE)
