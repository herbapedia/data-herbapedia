#!/usr/bin/env node
/**
 * Fix TCM herb category assignments.
 *
 * This script corrects TCM herb category assignments based on standard TCM Materia Medica classification.
 * Currently 98/99 herbs are incorrectly assigned to "tonify-qi".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

const CATEGORY_BASE = 'https://www.herbapedia.org/system/tcm/category/';

// TCM Herb Category Mapping based on standard 中药学 classification
// Format: slug -> correct category
const HERB_CATEGORIES = {
  // Release Exterior (解表药)
  'sheng-jiang': 'release-exterior',
  'fangfeng': 'release-exterior',
  'zisuye': 'release-exterior',
  'mint': 'release-exterior',
  'chrysanthemum': 'release-exterior',

  // Clear Heat (清热药)
  'danshen': 'clear-heat',
  'lianqiao': 'clear-heat',
  'kushen': 'clear-heat',
  'quanshen': 'clear-heat',
  'dihuang': 'clear-heat',
  'shoudihuang': 'clear-heat',
  'dandelion': 'clear-heat',
  'jinyinhua': 'clear-heat',
  'chuanxinlian': 'clear-heat',
  'indigowoad-root-banlangen': 'clear-heat',
  'shihu': 'clear-heat',

  // Downward Draining (泻下药)
  'chinese-rhubarb-root': 'downward-draining',

  // Wind-Damp Dispelling (祛风湿药)
  'duhuo': 'wind-damp-dispelling',
  'fangji': 'wind-damp-dispelling',

  // Transform Dampness (化湿药)
  'cangzhu': 'transform-dampness',
  'patchouli': 'transform-dampness',
  'peilan': 'transform-dampness',
  'cardamom': 'transform-dampness',

  // Leach Dampness (利水渗湿药)
  'fuling': 'leach-dampness',
  'zexie': 'leach-dampness',
  'jobs-tears': 'leach-dampness',
  'corn-silk': 'leach-dampness',

  // Warm Interior (温里药)
  'ganjiang': 'warm-interior',
  'rougui': 'warm-interior',
  'wuzhuyu': 'warm-interior',

  // Rectify Qi (理气药)
  'tangerine-peel': 'rectify-qi',
  'zhiko': 'rectify-qi',
  'xiangfu': 'rectify-qi',
  'chenpi': 'rectify-qi',

  // Digestive (消食药)
  'shenqu': 'digestive',
  'shanzha': 'digestive',
  'shenjinmai': 'digestive',

  // Blood-Quickening (活血化瘀药)
  'chuanxiong': 'blood-quickening',
  'taoren-or-peach-kernel': 'blood-quickening',
  'chinese-angelica-or-dong-quai': 'blood-quickening',
  'honghua': 'blood-quickening',

  // Calm Spirit (安神药)
  'suanzaoren': 'calm-spirit',
  'yuanzhi': 'calm-spirit',
  'muli': 'calm-spirit',
  'hehuanhua': 'calm-spirit',
  'dragon-bone': 'calm-spirit',

  // Calm Liver (平肝熄风药)
  'tianma': 'calm-liver',
  'gouteng': 'calm-liver',
  'muli': 'calm-liver',

  // Open Orifices (开窍药)
  'changpu': 'open-orifices',

  // Tonify Qi (补气药) - These are CORRECT
  'ren-shen': 'tonify-qi',
  'dangshen': 'tonify-qi',
  'baizhu': 'tonify-qi',
  'huangqi': 'tonify-qi',
  'liquorice-root': 'tonify-qi',
  'shan-yao': 'tonify-qi',
  'american-ginseng': 'tonify-qi',
  'ginseng': 'tonify-qi',

  // Tonify Blood (补血药)
  'baishao': 'tonify-blood',
  'longyan': 'tonify-blood',

  // Tonify Yin (补阴药)
  'maidong': 'tonify-yin',
  'beishashen': 'tonify-yin',
  'gouqizi': 'tonify-yin',
  'nuzhenzi': 'tonify-yin',
  'black-sesame-seed': 'tonify-yin',

  // Tonify Yang (补阳药)
  'duzhong': 'tonify-yang',
  'buguzhi': 'tonify-yang',
  'roucongrong': 'tonify-yang',
  'suoyang': 'tonify-yang',
  'deer-antler': 'tonify-yang',
  'deer-horn-gelatine': 'tonify-yang',

  // Astringent (收涩药)
  'jinyingzi': 'astringent',
  'shanzhuyu': 'astringent',
  'wuweizi': 'astringent',
  'baiziren': 'astringent',

  // Additional mappings based on TCM classification
  'algae': 'transform-phlegm',
  'asparagus-root': 'tonify-yin',
  'barley': 'leach-dampness',
  'beishashen': 'tonify-yin',
  'birds-nest': 'tonify-yin',
  'bitter-orange': 'rectify-qi',
  'blueberry': 'tonify-yin',
  'cordyceps': 'tonify-yang',
  'fleece-flower': 'tonify-blood',
  'great-burdock': 'clear-heat',
  'guijia-or-guiban': 'tonify-yin',
  'hawthorn': 'digestive',
  'honey': 'tonify-qi',
  'horny-goat-weed': 'tonify-yang',
  'indian-mulberry-root': 'clear-heat',
  'jiaogulan': 'tonify-qi',
  'lingzhi-reishi': 'calm-spirit',
  'lingzhi-spores': 'calm-spirit',
  'lotus-leaf': 'leach-dampness',
  'milk-vetch': 'tonify-qi',
  'mohanlian': 'tonify-yin',
  'orobanches': 'tonify-yang',
  'rhodiola': 'tonify-qi',
  'shegan': 'clear-heat',
  'shouwuteng': 'calm-spirit',
  'tree-peony': 'clear-heat',
  'tusizi': 'tonify-yang',
  'wheat': 'tonify-qi',
  'white-mulberry-leaf': 'release-exterior',
  'white-peony-root': 'tonify-blood',
  'white-willow-bark': 'clear-heat',
  'wild-yam': 'tonify-qi',
  'xiongcane': 'blood-quickening',
  'yunzhi': 'tonify-qi',
  'zhusun': 'tonify-yin'
};

function migrateFile(filePath, slug) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;
  const oldCategory = content.hasCategory;

  // Get the correct category for this herb
  const correctCategory = HERB_CATEGORIES[slug];

  if (correctCategory && oldCategory) {
    const oldCategoryId = oldCategory['@id'];
    const expectedId = `${CATEGORY_BASE}${correctCategory}`;

    if (oldCategoryId !== expectedId) {
      content.hasCategory = { '@id': expectedId };
      modified = true;
      return { modified, oldCategory: oldCategoryId, newCategory: expectedId };
    }
  }

  return { modified };
}

// Process TCM profiles
const tcmDir = path.join(DATA_DIR, 'systems', 'tcm', 'herbs');
let updated = 0;
let unchanged = 0;
let noMapping = 0;
const changes = [];

const slugs = fs.readdirSync(tcmDir).filter(f => {
  return fs.statSync(path.join(tcmDir, f)).isDirectory();
});

for (const slug of slugs) {
  const filePath = path.join(tcmDir, slug, 'profile.jsonld');
  if (!fs.existsSync(filePath)) continue;

  const result = migrateFile(filePath, slug);

  if (result.modified) {
    fs.writeFileSync(filePath, JSON.stringify(JSON.parse(fs.readFileSync(filePath, 'utf8')), null, 2) + '\n');
    // Re-read and update
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    content.hasCategory = { '@id': result.newCategory };
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');

    updated++;
    changes.push({
      slug,
      old: result.oldCategory,
      new: result.newCategory
    });
    console.log(`Updated: ${slug} (${result.oldCategory} → ${result.newCategory})`);
  } else if (!HERB_CATEGORIES[slug]) {
    noMapping++;
    console.log(`No mapping: ${slug}`);
  } else {
    unchanged++;
  }
}

console.log('\n=== Summary ===');
console.log(`Updated: ${updated}`);
console.log(`Unchanged (already correct): ${unchanged}`);
console.log(`No mapping defined: ${noMapping}`);

if (changes.length > 0) {
  console.log('\n=== Changes Made ===');
  changes.forEach(c => {
    const oldCat = c.old.replace(CATEGORY_BASE, '');
    const newCat = c.new.replace(CATEGORY_BASE, '');
    console.log(`${c.slug}: ${oldCat} → ${newCat}`);
  });
}
