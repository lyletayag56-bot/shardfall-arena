# Shardfall Arena 3D

A 5v5 arena battle that runs in the browser: sixteen heroes, three lanes and a jungle. Play against bots, fight a 1v1, or sit
down at a table with friends by sending them a link.

**Play it: https://lyletayag56-bot.github.io/shardfall-arena/**

Nothing to install and no account needed. Press **Friends** to host a table; the table shows an invite link to send.

## What is here

- `index.html` is the whole game, one page (it loads three.js r128 and two fonts from public CDNs).
- `cover.jpg`, the icons and `manifest.webmanifest` are what a link to the page shows elsewhere, and what a phone uses when the
  page is added to its home screen.
- `source/` holds what `index.html` is built from: `source/src/` in the order `source/build.js` lists, joined into one script.

Playing together needs no server of the game's own: pages find each other through public MQTT relays and, where two devices
can reach each other, talk directly over WebRTC.
