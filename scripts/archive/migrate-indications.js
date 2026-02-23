#!/usr/bin/env node
/**
 * Migrate TCM profile indications from string arrays to language maps.
 *
 * Before: "indications": ["Qi deficiency patterns", "Spleen Qi deficiency..."]
 * After:  "indications": [{ "en": "Qi deficiency patterns", "zh-Hant": "氣虛證", "zh-Hans": "气虚证" }, ...]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

// Indication translations mapping
const INDICATION_TRANSLATIONS = {
  // Qi deficiency patterns
  "Qi deficiency patterns": {
    "zh-Hant": "氣虛證",
    "zh-Hans": "气虚证"
  },
  "Spleen Qi deficiency: fatigue, poor appetite, loose stools": {
    "zh-Hant": "脾氣虛：倦怠乏力、食少、便溏",
    "zh-Hans": "脾气虚：倦怠乏力、食少、便溏"
  },
  "Lung Qi deficiency: shortness of breath, weak voice": {
    "zh-Hant": "肺氣虛：氣短、聲音低弱",
    "zh-Hans": "肺气虚：气短、声音低弱"
  },
  "Heart Qi deficiency: palpitations, insomnia": {
    "zh-Hant": "心氣虛：心悸、失眠",
    "zh-Hans": "心气虚：心悸、失眠"
  },
  "Severe Qi collapse: shock, faint pulse": {
    "zh-Hant": "氣虛欲脫：休克、脈微欲絕",
    "zh-Hans": "气虚欲脱：休克、脉微欲绝"
  },

  // Exterior patterns
  "Exterior cold pattern": {
    "zh-Hant": "風寒表證",
    "zh-Hans": "风寒表证"
  },
  "Common cold with chills": {
    "zh-Hant": "風寒感冒",
    "zh-Hans": "风寒感冒"
  },
  "Nausea and vomiting": {
    "zh-Hant": "噁心嘔吐",
    "zh-Hans": "恶心呕吐"
  },
  "Cough with white phlegm": {
    "zh-Hant": "寒痰咳嗽",
    "zh-Hans": "寒痰咳嗽"
  },
  "Fish and crab detoxification": {
    "zh-Hant": "魚蟹中毒",
    "zh-Hans": "鱼蟹中毒"
  },

  // Additional common indications (to be expanded)
  "Spleen deficiency with dampness": {
    "zh-Hant": "脾虛濕盛",
    "zh-Hans": "脾虚湿盛"
  },
  "Fluid deficiency with thirst": {
    "zh-Hant": "津傷口渴",
    "zh-Hans": "津伤口渴"
  },
  "Blood deficiency patterns": {
    "zh-Hant": "血虛證",
    "zh-Hans": "血虚证"
  },
  "Yin deficiency patterns": {
    "zh-Hant": "陰虛證",
    "zh-Hans": "阴虚证"
  },
  "Yang deficiency patterns": {
    "zh-Hant": "陽虛證",
    "zh-Hans": "阳虚证"
  },
  "Dampness patterns": {
    "zh-Hant": "濕證",
    "zh-Hans": "湿证"
  },
  "Phlegm patterns": {
    "zh-Hant": "痰證",
    "zh-Hans": "痰证"
  },
  "Blood stasis patterns": {
    "zh-Hant": "血瘀證",
    "zh-Hans": "血瘀证"
  },
  "Heat patterns": {
    "zh-Hant": "熱證",
    "zh-Hans": "热证"
  },
  "Cold patterns": {
    "zh-Hant": "寒證",
    "zh-Hans": "寒证"
  },
  "Wind patterns": {
    "zh-Hant": "風證",
    "zh-Hans": "风证"
  },
  "Food stagnation": {
    "zh-Hant": "食積",
    "zh-Hans": "食积"
  },
  "Qi stagnation": {
    "zh-Hant": "氣滯",
    "zh-Hans": "气滞"
  },
  "Pain patterns": {
    "zh-Hant": "疼痛",
    "zh-Hans": "疼痛"
  },
  "Insomnia and anxiety": {
    "zh-Hant": "失眠焦慮",
    "zh-Hans": "失眠焦虑"
  },
  "Cough and asthma": {
    "zh-Hant": "咳嗽氣喘",
    "zh-Hans": "咳嗽气喘"
  },
  "Digestive disorders": {
    "zh-Hant": "脾胃不和",
    "zh-Hans": "脾胃不和"
  },
  "Menstrual disorders": {
    "zh-Hant": "月經不調",
    "zh-Hans": "月经不调"
  },
  "Joint pain and arthritis": {
    "zh-Hant": "關節疼痛、痹證",
    "zh-Hans": "关节疼痛、痹证"
  },
  "Edema": {
    "zh-Hant": "水腫",
    "zh-Hans": "水肿"
  },
  "Urinary disorders": {
    "zh-Hant": "小便不利",
    "zh-Hans": "小便不利"
  },
  "Liver Qi stagnation": {
    "zh-Hant": "肝氣鬱結",
    "zh-Hans": "肝气郁结"
  },
  "Kidney deficiency": {
    "zh-Hant": "腎虛",
    "zh-Hans": "肾虚"
  },
  "Exterior heat pattern": {
    "zh-Hant": "風熱表證",
    "zh-Hans": "风热表证"
  },
  "Common cold with fever": {
    "zh-Hant": "風熱感冒",
    "zh-Hans": "风热感冒"
  },
  "Sore throat": {
    "zh-Hant": "咽喉腫痛",
    "zh-Hans": "咽喉肿痛"
  },
  "Fever": {
    "zh-Hant": "發熱",
    "zh-Hans": "发热"
  },
  "Inflammation": {
    "zh-Hant": "炎症",
    "zh-Hans": "炎症"
  },
  "Toxic heat": {
    "zh-Hant": "熱毒",
    "zh-Hans": "热毒"
  },
  "Skin disorders": {
    "zh-Hant": "皮膚病",
    "zh-Hans": "皮肤病"
  },
  "Infections": {
    "zh-Hant": "感染",
    "zh-Hans": "感染"
  },
  "Diarrhea": {
    "zh-Hant": "腹瀉",
    "zh-Hans": "腹泻"
  },
  "Abdominal pain": {
    "zh-Hant": "腹痛",
    "zh-Hans": "腹痛"
  },
  "Headache": {
    "zh-Hant": "頭痛",
    "zh-Hans": "头痛"
  },
  "Dizziness": {
    "zh-Hant": "頭暈",
    "zh-Hans": "头晕"
  },
  "Fatigue": {
    "zh-Hant": "疲勞",
    "zh-Hans": "疲劳"
  },
  "Weakness": {
    "zh-Hant": "虛弱",
    "zh-Hans": "虚弱"
  },
  "Poor appetite": {
    "zh-Hant": "食慾不振",
    "zh-Hans": "食欲不振"
  },
  "Distension": {
    "zh-Hant": "脹滿",
    "zh-Hans": "胀满"
  },
  "Bleeding": {
    "zh-Hant": "出血",
    "zh-Hans": "出血"
  },
  "Trauma": {
    "zh-Hant": "外傷",
    "zh-Hans": "外伤"
  },
  "Convulsions": {
    "zh-Hant": "痙攣",
    "zh-Hans": "痉挛"
  },
  "Palpitations": {
    "zh-Hant": "心悸",
    "zh-Hans": "心悸"
  },
  "Shortness of breath": {
    "zh-Hant": "氣短",
    "zh-Hans": "气短"
  },
  "Spontaneous sweating": {
    "zh-Hant": "自汗",
    "zh-Hans": "自汗"
  },
  "Night sweats": {
    "zh-Hant": "盜汗",
    "zh-Hans": "盗汗"
  },
  "Impotence": {
    "zh-Hant": "陽痿",
    "zh-Hans": "阳痿"
  },
  "Constipation": {
    "zh-Hant": "便秘",
    "zh-Hans": "便秘"
  },
  "Jaundice": {
    "zh-Hant": "黃疸",
    "zh-Hans": "黄疸"
  }
};

const TCM_HERBS_DIR = path.join(DATA_DIR, 'systems', 'tcm', 'herbs');

function migrateFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!content.indications || !Array.isArray(content.indications)) {
    return { updated: false, reason: 'no indications array' };
  }

  // Check if already migrated (contains language maps)
  if (content.indications.length > 0 && typeof content.indications[0] === 'object') {
    return { updated: false, reason: 'already language maps' };
  }

  const newIndications = [];
  const missingTranslations = [];

  for (const indication of content.indications) {
    const translation = INDICATION_TRANSLATIONS[indication];
    if (translation) {
      newIndications.push({
        "en": indication,
        ...translation
      });
    } else {
      // Keep as-is with placeholder for missing translation
      newIndications.push({
        "en": indication,
        "zh-Hant": `【${indication}】待翻譯`,
        "zh-Hans": `【${indication}】待翻译`
      });
      missingTranslations.push(indication);
    }
  }

  content.indications = newIndications;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');

  return { updated: true, missingTranslations };
}

function main() {
  let updated = 0;
  let skipped = 0;
  const allMissingTranslations = new Set();

  const slugs = fs.readdirSync(TCM_HERBS_DIR).filter(f => {
    return fs.statSync(path.join(TCM_HERBS_DIR, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(TCM_HERBS_DIR, slug, 'profile.jsonld');
    if (!fs.existsSync(filePath)) continue;

    const result = migrateFile(filePath);

    if (result.updated) {
      updated++;
      console.log(`Updated: tcm/herbs/${slug}`);
      if (result.missingTranslations.length > 0) {
        result.missingTranslations.forEach(t => allMissingTranslations.add(t));
      }
    } else {
      skipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  if (allMissingTranslations.size > 0) {
    console.log('\n=== Missing Translations ===');
    for (const t of allMissingTranslations) {
      console.log(`  - "${t}"`);
    }
    console.log(`\nTotal missing: ${allMissingTranslations.size}`);
  }
}

main();
