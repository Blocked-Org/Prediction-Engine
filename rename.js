const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = [...walk('frontend/src'), ...walk('frontend/messages')];
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let hasChange = false;

  if (content.includes('BrandOS')) {
    content = content.replace(/BrandOS/g, 'BuniOS');
    hasChange = true;
  }
  if (content.includes('InfinitySim')) {
    content = content.replace(/InfinitySim/g, 'BuniOS');
    hasChange = true;
  }
  if (content.includes('Infinity<span')) {
    content = content.replace(/Infinity<span([^>]+)>Sim<\/span>/g, 'Buni<span$1>OS</span>');
    hasChange = true;
  }

  if (hasChange) {
    fs.writeFileSync(f, content);
    changed++;
    console.log('Updated', f);
  }
});

console.log('Total files changed:', changed);
