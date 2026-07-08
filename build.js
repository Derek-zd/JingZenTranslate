/* JingZen Translate - build script */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isProd = process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');

const entryPoints = [
  'src/background/service-worker.js',
  'src/content/content.js',
  'src/options/options.js',
  'src/popup/popup.js',
];

function copyStatic() {
  // CSS — copy alongside their corresponding JS in dist subdirectories
  const cssFiles = [
    ['src/content/content.css', 'dist/content/content.css'],
    ['src/options/options.css', 'dist/options/options.css'],
    ['src/popup/popup.css', 'dist/popup/popup.css'],
  ];
  for (const [src, dest] of cssFiles) {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  // HTML — copy and update script/css paths for flat dist layout
  const htmlFiles = [
    ['src/options/options.html', 'dist/options/options.html'],
    ['src/popup/popup.html', 'dist/popup/popup.html'],
  ];
  for (const [src, dest] of htmlFiles) {
    if (!fs.existsSync(src)) continue;
    let html = fs.readFileSync(src, 'utf-8');
    // Update script src to just the filename (same directory in dist)
    html = html.replace(
      /<script src="[^"]*\.js"><\/script>/g,
      (match) => {
        const name = path.basename(match.match(/src="([^"]+)"/)[1]);
        return `<script src="${name}"></script>`;
      }
    );
    // Update CSS link to just the filename (same directory in dist)
    html = html.replace(
      /<link rel="stylesheet" href="[^"]*\.css"[^>]*>/g,
      (match) => {
        const name = path.basename(match.match(/href="([^"]+)"/)[1]);
        return `<link rel="stylesheet" href="${name}">`;
      }
    );
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, html);
  }

  // Icons
  if (fs.existsSync('icons')) {
    fs.mkdirSync('dist/icons', { recursive: true });
    for (const f of fs.readdirSync('icons')) {
      fs.copyFileSync(path.join('icons', f), path.join('dist/icons', f));
    }
  }

  // Generate release-ready manifest.json in dist/ (paths without "dist/" prefix)
  if (fs.existsSync('manifest.json')) {
    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf-8'));
    // Strip "dist/" prefix from all paths for store-ready zip
    manifest.action.default_popup = manifest.action.default_popup.replace(/^dist\//, '');
    manifest.options_page = manifest.options_page.replace(/^dist\//, '');
    manifest.background.service_worker = manifest.background.service_worker.replace(/^dist\//, '');
    manifest.content_scripts = manifest.content_scripts.map((cs) => ({
      ...cs,
      js: cs.js.map((j) => j.replace(/^dist\//, '')),
      css: cs.css.map((c) => c.replace(/^dist\//, '')),
    }));
    manifest.icons = Object.fromEntries(
      Object.entries(manifest.icons).map(([k, v]) => [k, v.replace(/^dist\//, '')])
    );
    fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  }

  console.log('[build] static files copied');
}

async function build() {
  console.log(`[build] ${isProd ? 'production' : 'development'} build...`);

  const buildOptions = {
    entryPoints,
    bundle: true,
    outdir: 'dist',
    target: 'chrome100',
    format: 'iife',
    minify: isProd,
    sourcemap: !isProd,  // only in dev mode
  };

  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      copyStatic();
      console.log('[build] watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      copyStatic();
      console.log('[build] complete');
    }
  } catch (err) {
    console.error('[build] failed:', err);
    process.exit(1);
  }
}

build();
