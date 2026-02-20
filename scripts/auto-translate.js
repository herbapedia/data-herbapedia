#!/usr/bin/env node

/**
 * Herbapedia Auto-Translate Script
 *
 * Automatically translates missing fields in Chinese YAML files
 * by reading the English content and generating translations.
 *
 * This script uses pre-computed translations from the batch processing.
 *
 * Usage:
 *   node scripts/auto-translate.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT_DIR, 'src/content/herbs')
const REPORT_PATH = path.join(ROOT_DIR, 'content-report.json')

// All translations from batch processing
const TRANSLATIONS = {
  // Batch 1
  "american-ginseng": {
    "zh-HK": { "history": "此藥草原產於北美東部和加拿大，傳統上為美洲原住民所使用，現今亦在中國和法國栽培。其分叉狀根部於成熟時採收，通常需時三至四年。本品首載於《本草從新》。", "modern_usage": "人參屬於適應原（即能增強人體抵抗壓力能力的物質），具有抗癌及抗氧化特性。臨床研究亦顯示花旗參具有顯著的抗疲勞及抗利尿作用。" },
    "zh-CN": { "history": "此草药原产于北美东部和加拿大，传统上为美洲原住民所使用，现今亦在中国和法国栽培。其分叉状根部于成熟时采收，通常需时三至四年。本品首载于《本草从新》。", "modern_usage": "人参属于适应原（即能增强人体抵抗压力能力的物质），具有抗癌及抗氧化特性。临床研究亦显示西洋参具有显著的抗疲劳及抗利尿作用。" }
  },
  "asparagus-root": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "取自天門冬 Asparagus cochinchinensis (Lour.) Merr. 的根部。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "取自天门冬 Asparagus cochinchinensis (Lour.) Merr. 的根部。" }
  },
  "baizhu": {
    "zh-HK": { "introduction": "菊科植物白朮 Atractylodes macrocephala Koidz. 的根莖。", "modern_usage": "白朮已在臨床試驗中用於治療便秘、腹瀉、肝臟疾病、頭暈及多涎症，效果良好。" },
    "zh-CN": { "introduction": "菊科植物白术 Atractylodes macrocephala Koidz. 的根茎。", "modern_usage": "白术已在临床试验中用于治疗便秘、腹泻、肝脏疾病、头晕及多涎症，效果良好。" }
  },
  "baiziren": {
    "zh-HK": { "introduction": "柏科植物側柏 Biota orientalis (L.) Endl. 的種子（去種皮）。" },
    "zh-CN": { "introduction": "柏科植物侧柏 Biota orientalis (L.) Endl. 的种子（去种皮）。" }
  },
  "balm-mint-oil": {
    "zh-HK": { "modern_usage": "香蜂草，常稱為檸檬香蜂草，因其清新宜人的薄荷柑橘香氣而廣泛應用於香水及化妝品中。" },
    "zh-CN": { "modern_usage": "香蜂草，常称为柠檬香蜂草，因其清新宜人的薄荷柑橘香气而广泛应用于香水及化妆品中。" }
  },
  "barley": {
    "zh-HK": { "history": "首載於《本草綱目》。", "modern_usage": "整粒大麥種子及其製品正被研究作為糖尿病、高膽固醇及肥胖症的潛在治療方法。" },
    "zh-CN": { "history": "首载于《本草纲目》。", "modern_usage": "整粒大麦种子及其制品正被研究作为糖尿病、高胆固醇及肥胖症的潜在治疗方法。" }
  },
  "beishashen": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "繖形科植物珊瑚菜 Glehnia littoralis F. Schmidt ex Miq. 的根部。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "伞形科植物珊瑚菜 Glehnia littoralis F. Schmidt ex Miq. 的根部。" }
  },
  "bilberry": {
    "zh-HK": { "history": "歐洲越橘在歐洲醫學中的應用已近千年，主要用於治療胃部疾病和腹瀉。其果實含有單寧，這類物質同時具有消炎和收斂（收縮和緊緻組織）的作用，被認為是其舒緩胃部問題的原因。歐洲越橘的葉片在傳統上亦被用於治療糖尿病。" },
    "zh-CN": { "history": "欧洲越橘在欧洲医学中的应用已近千年，主要用于治疗胃部疾病和腹泻。其果实含有单宁，这类物质同时具有消炎和收敛（收缩和紧致组织）的作用，被认为是其舒缓胃部问题的原因。欧洲越橘的叶片在传统上亦被用于治疗糖尿病。" }
  },
  "birds-nest": {
    "zh-HK": { "history": "首載於《本草綱目》。", "introduction": "雨燕科（Apodidae）金絲燕屬（Collocalia spp.）的巢。", "modern_usage": "燕窩含有豐富的水溶性醣蛋白，能促進免疫系統內的細胞生長和分裂。" },
    "zh-CN": { "history": "首载于《本草纲目》。", "introduction": "雨燕科（Apodidae）金丝燕属（Collocalia spp.）的巢。", "modern_usage": "燕窝含有丰富的水溶性糖蛋白，能促进免疫系统内的细胞生长和分裂。" }
  },
  "black-sesame-seed": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "胡麻科植物芝麻 Sesamum indicum L. 的種子。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "胡麻科植物芝麻 Sesamum indicum L. 的种子。" }
  },
  // Batch 2
  "blueberry": {
    "zh-HK": { "history": "藍莓是少數真正藍色的食物之一，原產於北美洲。在全球約2,000種藍黑色漿果中，藍莓最受歡迎且應用最廣泛。藍莓植物的漿果、葉片和根部都曾作為藥用，但現代研究主要集中在漿果本身。" },
    "zh-CN": { "history": "蓝莓是少数真正蓝色的食物之一，原产于北美洲。在全球约2,000种蓝黑色浆果中，蓝莓最受欢迎且应用最广泛。蓝莓植物的浆果、叶片和根部都曾作为药用，但现代研究主要集中在浆果本身。" }
  },
  "borage-extract": {
    "zh-HK": { "history": "琉璃苣植物自古以來便被用於藥用。希臘人和羅馬人都認為琉璃苣具有驅散憂鬱、激發勇氣的功效。" },
    "zh-CN": { "history": "琉璃苣植物自古以来便被用于药用。希腊人和罗马人都认为琉璃苣具有驱散忧郁、激发勇气的功效。" }
  },
  "cangzhu": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "為菊科植物茅蒼朮 Atractylodes lancea (Thunb.) DC.或北蒼朮 Atractylodes chinensis (DC.) Koidz.的根莖。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "为菊科植物茅苍术 Atractylodes lancea (Thunb.) DC.或北苍术 Atractylodes chinensis (DC.) Koidz.的根茎。" }
  },
  "capigen": {
    "zh-HK": { "introduction": "辣椒素是從辣椒（Capsicum annuum）中提取的活性成分。", "modern_usage": "用於促進微循環。" },
    "zh-CN": { "introduction": "辣椒素是从辣椒（Capsicum annuum）中提取的活性成分。", "modern_usage": "用于促进微循环。" }
  },
  "cardamom": {
    "zh-HK": { "history": "首載於《本草圖經》。", "introduction": "為薑科植物白豆蔻 Amomum kravanh Pierre ex Gagnep.或爪哇白豆蔻 Amomum tsoko C. F. Liang et D. Fang的果實。" },
    "zh-CN": { "history": "首载于《本草图经》。", "introduction": "为姜科植物白豆蔻 Amomum kravanh Pierre ex Gagnep.或爪哇白豆蔻 Amomum tsoko C. F. Liang et D. Fang的果实。" }
  },
  "ceramides": {
    "zh-HK": { "introduction": "神經醯胺是一類蠟狀脂質分子，在真核細胞的細胞膜中濃度極高。" },
    "zh-CN": { "introduction": "神经酰胺是一类蜡状脂质分子，在真核细胞的细胞膜中浓度极高。" }
  },
  "changpu": {
    "zh-HK": { "introduction": "為天南星科植物石菖蒲 Acorus tatarinowii Schott的根莖。", "modern_usage": "石菖蒲具有抗驚厥、鎮靜和降壓作用，並具有抗菌和抗真菌功效。" },
    "zh-CN": { "introduction": "为天南星科植物石菖蒲 Acorus tatarinowii Schott的根茎。", "modern_usage": "石菖蒲具有抗惊厥、镇静和降压作用，并具有抗菌和抗真菌功效。" }
  },
  "chinese-angelica-or-dong-quai": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "為傘形科植物當歸 Angelica sinensis (Oliv.) Diels的根。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "为伞形科植物当归 Angelica sinensis (Oliv.) Diels的根。" }
  },
  "chinese-bellflower": {
    "zh-HK": { "history": "首載於《神農本草經》。", "introduction": "為桔梗科植物桔梗 Platycodon grandiflorum (Jacq.) A. DC.的根。" },
    "zh-CN": { "history": "首载于《神农本草经》。", "introduction": "为桔梗科植物桔梗 Platycodon grandiflorum (Jacq.) A. DC.的根。" }
  },
  "chinese-mugwort-leaf": {
    "zh-HK": { "history": "首載於《本草圖經》。", "introduction": "為菊科植物艾 Artemisia argyi Levl. et Vant.的葉片。" },
    "zh-CN": { "history": "首载于《本草图经》。", "introduction": "为菊科植物艾 Artemisia argyi Levl. et Vant.的叶片。" }
  }
}

function parseYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return yaml.load(content)
  } catch (error) {
    return null
  }
}

function buildYaml(data) {
  const lines = []
  if (data.title) {
    const lang = data.metadata?.language || 'zh-HK'
    lines.push(`# ${data.title}`)
    if (data.metadata?.source_url) {
      lines.push(`# Source: ${data.metadata.source_url}`)
    }
    lines.push(`# Language: ${lang}`)
    lines.push('')
  }
  lines.push(`id: "${data.id || ''}"`)
  lines.push(`slug: "${data.slug || ''}"`)
  lines.push(`category: "${data.category || ''}"`)
  lines.push(`title: "${data.title || ''}"`)
  if (data.english_title) {
    lines.push(`english_title: "${data.english_title}"`)
  }
  if (data.scientific_name) {
    lines.push(`scientific_name: "${data.scientific_name}"`)
  }
  if (data.image) {
    lines.push(`image: "${data.image}"`)
  }
  lines.push('')
  const contentFields = ['history', 'introduction', 'traditional_usage', 'modern_usage', 'functions']
  for (const field of contentFields) {
    if (data[field]) {
      lines.push(`${field}: |`)
      data[field].toString().split('\n').forEach(line => {
        lines.push(`  ${line}`)
      })
      lines.push('')
    }
  }
  if (data.metadata) {
    lines.push('metadata:')
    lines.push(`  source: "${data.metadata.source || ''}"`)
    if (data.metadata.source_url) {
      lines.push(`  source_url: "${data.metadata.source_url}"`)
    }
    if (data.metadata.scraped_at) {
      lines.push(`  scraped_at: "${data.metadata.scraped_at}"`)
    }
    if (data.metadata.language) {
      lines.push(`  language: "${data.metadata.language}"`)
    }
  }
  return lines.join('\n') + '\n'
}

function applyTranslations() {
  let updatedCount = 0

  for (const [slug, langData] of Object.entries(TRANSLATIONS)) {
    for (const [lang, fields] of Object.entries(langData)) {
      const langFile = path.join(CONTENT_DIR, slug, `${lang}.yaml`)
      if (!fs.existsSync(langFile)) continue

      const existingData = parseYaml(langFile)
      if (!existingData) continue

      let hasUpdates = false
      for (const [field, value] of Object.entries(fields)) {
        if (!existingData[field]) {
          existingData[field] = value
          hasUpdates = true
        }
      }

      if (hasUpdates) {
        const yamlContent = buildYaml(existingData)
        fs.writeFileSync(langFile, yamlContent)
        console.log(`Updated ${slug}/${lang}.yaml`)
        updatedCount++
      }
    }
  }

  console.log(`\nSummary: ${updatedCount} files updated`)
}

applyTranslations()
