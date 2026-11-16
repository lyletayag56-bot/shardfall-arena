const fs = require('fs'), path = require('path');
const SRC_DIR = process.env.SRC_DIR || 'src';       // (another tree of the sources can be built: SRC_DIR=src.bak_v20 node build.js)
const src = f => fs.readFileSync(path.join(__dirname, SRC_DIR, f), 'utf8');
const files = ['01_data.js', '02_map.js', '03_sim.js', '04_ai.js', '04n_net.js', '05a_gfx.js', '05b_world.js', '05c_models.js', '05d_fx.js', '05e_view.js', '06_ui.js', '07l_link.js', '07_net.js'].filter(f => fs.existsSync(path.join(__dirname, SRC_DIR, f)));       // (the first four are the sim: its fingerprint)
// a recording of a match only plays on the sim that made it: the sim files' fingerprint goes in as SIM_ID
let fp = 0x811c9dc5; for (const f of files.slice(0, 4)) { const t = src(f); for (let i = 0; i < t.length; i++) { fp ^= t.charCodeAt(i); fp = Math.imul(fp, 0x01000193); } }
const SITE = process.env.SITE_URL || (fs.existsSync(path.join(__dirname, 'site.url')) ? fs.readFileSync(path.join(__dirname, 'site.url'), 'utf8').trim() : '');       // where the page lives on the open web (said to those Claude's own room does not take)
const js = "const SIM_ID = '" + (fp >>> 0).toString(16).padStart(8, '0') + "';\nconst SITE_URL = " + JSON.stringify(SITE) + ";\n" + files.map(src).join('\n');
if (js.includes('</script')) throw new Error('script terminator in source');
const three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>';
const out = src('page.html') + '\n' + three + '\n<script>\n' + js + '\n</script>\n';
fs.writeFileSync(path.join(__dirname, 'shardfall-arena-3d.html'), out);
// standalone copy with a document skeleton for local browser tests
fs.writeFileSync(path.join(__dirname, 'test', 'local.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + out + '</body></html>');
// the page as it is published: a whole document. Its first line is the skeleton every published version of this page has had (a
// reset, the viewport, room for a phone's own bars); the page itself has never carried one, so it is put on here.
const SKEL = '<!DOCTYPE html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), SKEL + '\n' + out + '\n</body></html>');
// the page as it stands on the open web: a whole document of its own, with what a link to it shows elsewhere (a name, a line, a
// picture) and what a phone needs to keep it on its home screen. The pictures are made by test/site_assets.js.
if (SITE) {
  const DESC = 'A 5v5 arena battle that runs in your browser: thirteen heroes, three lanes and a jungle. Play against bots, fight a 1v1, or sit down at a table with friends by sending them a link.';
  const HEAD = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    + '<title>Shardfall Arena 3D</title><meta name="description" content="' + DESC + '">'
    + '<meta property="og:type" content="website"><meta property="og:title" content="Shardfall Arena 3D"><meta property="og:description" content="' + DESC + '"><meta property="og:url" content="' + SITE + '"><meta property="og:image" content="' + SITE + 'cover.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
    + '<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#081216"><link rel="canonical" href="' + SITE + '">'
    + '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png"><link rel="manifest" href="manifest.webmanifest">'
    + '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Shardfall">'
    + '<style>:root{color-scheme:dark;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#081216;color:#e8f0ee}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>';
  fs.mkdirSync(path.join(__dirname, 'site'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'site', 'index.html'), HEAD + '\n' + out.replace(/^<title>[^<]*<\/title>\n/, '') + '\n</body></html>\n');
  fs.writeFileSync(path.join(__dirname, 'site', 'manifest.webmanifest'), JSON.stringify({ name: 'Shardfall Arena 3D', short_name: 'Shardfall', description: DESC, start_url: './', scope: './', display: 'fullscreen', orientation: 'landscape', background_color: '#081216', theme_color: '#081216',
    icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 1) + '\n');
  fs.writeFileSync(path.join(__dirname, 'site', '.nojekyll'), '');
}
console.log('built', (out.length / 1024).toFixed(0) + 'KB' + (SITE ? ' · site for ' + SITE : ''));
