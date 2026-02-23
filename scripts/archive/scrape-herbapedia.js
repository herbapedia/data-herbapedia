#!/usr/bin/env node

/**
 * Herbapedia Scraper v6
 * Uses scientific name matching + title matching for Chinese content
 *
 * Strategy:
 * 1. Scrape English pages first (establishes slug -> data mapping)
 * 2. Build scientific name index from English pages
 * 3. Scrape Chinese pages and match by:
 *    a) Scientific name (exact match)
 *    b) Partial scientific name match
 *    c) English title in Chinese title (e.g., "鈣 (Calcium)")
 *    d) Slug in Chinese title
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(ROOT_DIR, 'src/content/herbs')

const CONFIG = {
  baseUrl: 'https://www.vitaherbapedia.com',
  delay: 200,
  languages: {
    'en': { path: 'en', categorySuffix: '-en' },
    'zh-HK': { path: 'zh', categorySuffix: '' },
    'zh-CN': { path: 'cn', categorySuffix: '-cn' }
  },
  categories: {
    'chinese-herbs': 'chiherbs',
    'western-herbs': 'westherbs',
    'vitamins': 'vitamins',
    'minerals': 'minerals',
    'nutrients': 'nutrients'
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HerbapediaBot/1.0; +https://sipm.org)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error.message)
    return null
  }
}

function cleanText(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeScientificName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractSlugFromImageUrl(imageUrl) {
  if (!imageUrl) return null
  try {
    const urlObj = new URL(imageUrl)
    const filename = path.basename(urlObj.pathname)
    // Remove extension and any trailing numbers like -1, -2
    const name = filename.replace(/\.[^.]+$/, '').replace(/-\d+$/, '')
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  } catch {
    return null
  }
}

function extractSlugFromUrl(url) {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    const lastPart = pathParts[pathParts.length - 1]
    return lastPart
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  } catch {
    return null
  }
}

function extractContentSections(html) {
  const sections = {}
  const containerPattern = /<div class="desc_containter[^"]*"[^>]*>[\s\S]*?<div class="inner">([^<]+)<\/div>[\s\S]*?<div class="desc_content_container[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi

  let match
  while ((match = containerPattern.exec(html)) !== null) {
    const title = cleanText(match[1])
    const content = cleanText(match[2])

    const titleLower = title.toLowerCase()
    let key = titleLower

    if (titleLower.includes('history') || title.includes('歷史') || title.includes('历史')) key = 'history'
    else if (titleLower.includes('introduction') || title.includes('簡介') || title.includes('简介')) key = 'introduction'
    else if (titleLower.includes('traditional') || title.includes('傳統') || title.includes('传统') || title.includes('用法')) key = 'traditional_usage'
    else if (titleLower.includes('modern research') || title.includes('研究')) key = 'modern_research'
    else if (titleLower.includes('botanical') || (titleLower.includes('source') && titleLower.includes('plant')) || title.includes('來源') || title.includes('来源')) key = 'botanical_source'
    else if (titleLower.includes('function') || title.includes('功能') || title.includes('功效')) key = 'functions'
    else if (titleLower.includes('food source') || title.includes('食物來源') || title.includes('食物来源')) key = 'food_sources'
    else if (titleLower.includes('importance') || title.includes('重要性')) key = 'importance'
    else if (titleLower.includes('precaution') || titleLower.includes('warning') || title.includes('注意')) key = 'precautions'
    else if (titleLower.includes('dosage') || titleLower.includes('dose') || title.includes('劑量') || title.includes('剂量')) key = 'dosage'
    else if (titleLower.includes('modern') || title.includes('現代') || title.includes('现代')) key = 'modern_usage'

    if (content && content.length > 10) {
      sections[key] = content
    }
  }

  return sections
}

function parseHerbPage(html, url, language = 'en') {
  const data = {
    url,
    title: '',
    scientificName: '',
    imageUrl: null,
    slug: null,
    category: '',
    sections: {}
  }

  const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/)
  if (ogTitleMatch) {
    data.title = ogTitleMatch[1]
      .replace(/\s*-\s*維特草本百科$/, '')
      .replace(/\s*-\s* Vita Herbapedia$/, '')
      .replace(/\s*-\s*维特草本百科$/, '')
      .trim()
  }

  const sciMatch = html.match(/<h4[^>]*class="product_academic_title"[^>]*><i>([^<]+)<\/i><\/h4>/)
  if (sciMatch) {
    data.scientificName = cleanText(sciMatch[1])
  }

  const ogImageMatch = html.match(/property="og:image"\s+content="([^"]+)"/)
  if (ogImageMatch) {
    data.imageUrl = ogImageMatch[1]
  }

  if (language === 'en') {
    data.slug = extractSlugFromUrl(url)
  }

  for (const [cat, catPath] of Object.entries(CONFIG.categories)) {
    if (url.includes(catPath)) {
      data.category = cat
      break
    }
  }

  data.sections = extractContentSections(html)

  return data
}

function generateYaml(data, language, slug) {
  const lines = [
    `# ${data.title}`,
    `# Source: ${data.url}`,
    `# Language: ${language}`,
    '',
    `id: "${slug}"`,
    `slug: "${slug}"`,
    `category: "${data.category}"`,
    `title: "${data.title.replace(/"/g, '\\"')}"`,
  ]

  if (data.scientificName) {
    lines.push(`scientific_name: "${data.scientificName.replace(/"/g, '\\"')}"`)
  }

  lines.push(`image: "images/${slug}.jpg"`)
  lines.push('')

  const sectionOrder = ['history', 'introduction', 'botanical_source', 'traditional_usage',
                       'modern_usage', 'modern_research', 'functions', 'importance',
                       'food_sources', 'precautions', 'dosage']

  for (const section of sectionOrder) {
    if (data.sections[section]) {
      lines.push(`${section}: |`)
      lines.push(`  ${data.sections[section].replace(/\n/g, '\n  ')}`)
      lines.push('')
    }
  }

  lines.push('metadata:')
  lines.push('  source: "vitaherbapedia.com"')
  lines.push(`  source_url: "${data.url}"`)
  lines.push(`  scraped_at: "${new Date().toISOString()}"`)
  lines.push(`  language: "${language}"`)

  return lines.join('\n')
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

async function downloadImage(url, outputPath) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    fs.writeFileSync(outputPath, Buffer.from(buffer))
    return true
  } catch (error) {
    console.error(`    Failed to download ${url}:`, error.message)
    return false
  }
}

function getCategoryPath(category, language) {
  const catPath = CONFIG.categories[category]
  const langConfig = CONFIG.languages[language]
  return catPath + langConfig.categorySuffix
}

async function getCategoryUrls(category, language) {
  const langConfig = CONFIG.languages[language]
  const catPath = getCategoryPath(category, language)
  const categoryUrl = `${CONFIG.baseUrl}/${langConfig.path}/product-category/${catPath}/`

  console.log(`  Category URL: ${categoryUrl}`)

  const firstPageHtml = await fetchPage(categoryUrl)
  if (!firstPageHtml) {
    console.log('  Failed to fetch category page')
    return []
  }

  let urls = []
  const linkPattern = /href="([^"]*\/shop\/[^"]+)"/g
  let match
  while ((match = linkPattern.exec(firstPageHtml)) !== null) {
    let url = match[1]
    if (url.includes('/shop/') && !urls.includes(url)) {
      if (!url.startsWith('http')) {
        url = CONFIG.baseUrl + url
      }
      urls.push(url)
    }
  }

  let totalItems = urls.length

  // Try English pattern first, then Chinese
  let pageCountMatch = firstPageHtml.match(/Showing\s+\d+(?:–|–|-|&ndash;)\s*\d+\s+of\s+(\d+)/i)
  if (!pageCountMatch) pageCountMatch = firstPageHtml.match(/顯示\s+(\d+)\s+筆結果/)
  if (!pageCountMatch) pageCountMatch = firstPageHtml.match(/显示\s+(\d+)\s+条/)

  if (pageCountMatch) {
    totalItems = parseInt(pageCountMatch[1])
  }

  console.log(`  Found ${totalItems} items (first page: ${urls.length})`)

  let pageNum = 2
  while (urls.length < totalItems && pageNum <= 20) {
    const pageUrl = `${CONFIG.baseUrl}/${langConfig.path}/product-category/${catPath}/page/${pageNum}/`
    const pageHtml = await fetchPage(pageUrl)
    if (!pageHtml) break

    const pageUrls = []
    linkPattern.lastIndex = 0
    while ((match = linkPattern.exec(pageHtml)) !== null) {
      let url = match[1]
      if (url.includes('/shop/') && !pageUrls.includes(url)) {
        if (!url.startsWith('http')) {
          url = CONFIG.baseUrl + url
        }
        pageUrls.push(url)
      }
    }

    if (pageUrls.length === 0) break
    urls = [...new Set([...urls, ...pageUrls])]
    pageNum++
    await sleep(CONFIG.delay)
  }

  console.log(`  Total URLs: ${urls.length}`)
  return urls
}

async function scrapeEnglish() {
  console.log('\n' + '='.repeat(50))
  console.log('PHASE 1: Scraping English (baseline)')
  console.log('='.repeat(50))

  const slugToData = new Map()
  const sciNameToSlug = new Map()

  for (const category of Object.keys(CONFIG.categories)) {
    console.log(`\nCategory: ${category}`)

    const urls = await getCategoryUrls(category, 'en')

    for (const url of urls) {
      console.log(`\n  Scraping: ${url}`)
      const html = await fetchPage(url)
      if (!html) continue

      const data = parseHerbPage(html, url, 'en')
      if (!data.title || !data.slug) {
        console.log('    Skipping - no title or slug')
        continue
      }

      const slug = data.slug
      console.log(`    Title: ${data.title}`)
      console.log(`    Slug: ${slug}`)
      console.log(`    Scientific Name: ${data.scientificName || 'N/A'}`)
      console.log(`    Sections: ${Object.keys(data.sections).join(', ') || 'none'}`)

      const herbDir = path.join(CONTENT_DIR, slug)
      ensureDir(herbDir)
      ensureDir(path.join(herbDir, 'images'))

      if (data.imageUrl) {
        const ext = path.extname(new URL(data.imageUrl).pathname) || '.jpg'
        const imagePath = path.join(herbDir, 'images', `${slug}${ext}`)
        if (!fs.existsSync(imagePath)) {
          console.log(`    Downloading image...`)
          await downloadImage(data.imageUrl, imagePath)
        }
      }

      const yamlContent = generateYaml(data, 'en', slug)
      fs.writeFileSync(path.join(herbDir, 'en.yaml'), yamlContent)

      slugToData.set(slug, data)

      // Index by normalized scientific name
      if (data.scientificName) {
        const normalizedSciName = normalizeScientificName(data.scientificName)
        if (normalizedSciName) {
          sciNameToSlug.set(normalizedSciName, slug)
        }
      }

      await sleep(CONFIG.delay)
    }
  }

  return { slugToData, sciNameToSlug }
}

async function scrapeChinese(language, slugToData, sciNameToSlug) {
  const langName = language === 'zh-HK' ? 'Traditional Chinese' : 'Simplified Chinese'
  console.log('\n' + '='.repeat(50))
  console.log(`PHASE: Scraping ${langName}`)
  console.log('='.repeat(50))

  let matched = 0
  let unmatched = 0

  for (const category of Object.keys(CONFIG.categories)) {
    console.log(`\nCategory: ${category}`)

    const urls = await getCategoryUrls(category, language)

    for (const url of urls) {
      console.log(`\n  Scraping: ${url}`)
      const html = await fetchPage(url)
      if (!html) continue

      const data = parseHerbPage(html, url, language)
      if (!data.title) {
        console.log('    Skipping - no title')
        continue
      }

      console.log(`    Title: ${data.title}`)
      console.log(`    Scientific Name: ${data.scientificName || 'N/A'}`)
      console.log(`    Sections: ${Object.keys(data.sections).join(', ') || 'none'}`)

      // Match by scientific name first
      let matchedSlug = null
      let matchMethod = ''

      if (data.scientificName) {
        const normalizedSciName = normalizeScientificName(data.scientificName)
        matchedSlug = sciNameToSlug.get(normalizedSciName)
        if (matchedSlug) {
          matchMethod = 'scientific name'
        }
      }

      // Fallback 1: partial scientific name match
      if (!matchedSlug) {
        for (const [slug, enData] of slugToData.entries()) {
          if (data.scientificName && enData.scientificName) {
            const cnNorm = normalizeScientificName(data.scientificName)
            const enNorm = normalizeScientificName(enData.scientificName)
            if (cnNorm && enNorm && (cnNorm.includes(enNorm) || enNorm.includes(cnNorm))) {
              matchedSlug = slug
              matchMethod = 'partial scientific name'
              break
            }
          }
        }
      }

      // Fallback 2: match by image filename (extracted from og:image)
      // e.g., "https://.../calcium.jpg" -> "calcium" matches slug
      if (!matchedSlug && data.imageUrl) {
        const imageSlug = extractSlugFromImageUrl(data.imageUrl)
        if (imageSlug && slugToData.has(imageSlug)) {
          matchedSlug = imageSlug
          matchMethod = 'image filename'
        }
      }

      // Fallback 3: match by English title in Chinese title
      if (!matchedSlug) {
        const cnTitleLower = data.title.toLowerCase()
        for (const [slug, enData] of slugToData.entries()) {
          const enTitleLower = enData.title.toLowerCase()
          if (cnTitleLower.includes(enTitleLower) || enTitleLower.includes(cnTitleLower)) {
            matchedSlug = slug
            matchMethod = 'title match'
            break
          }
          if (cnTitleLower.includes(slug.replace(/-/g, ' '))) {
            matchedSlug = slug
            matchMethod = 'slug in title'
            break
          }
        }
      }

      if (matchedSlug) {
        console.log(`    Matched to: ${matchedSlug} (via ${matchMethod})`)
        matched++

        const herbDir = path.join(CONTENT_DIR, matchedSlug)
        const yamlContent = generateYaml(data, language, matchedSlug)
        fs.writeFileSync(path.join(herbDir, `${language}.yaml`), yamlContent)
        console.log(`    Saved: ${language}.yaml`)
      } else {
        console.log(`    WARNING: Could not match to any English directory`)
        console.log(`    Scientific name: ${data.scientificName}`)
        unmatched++
      }

      await sleep(CONFIG.delay)
    }
  }

  console.log(`\n  Matched: ${matched}, Unmatched: ${unmatched}`)
}

async function main() {
  console.log('Herbapedia Scraper v6')
  console.log('====================')
  console.log('Uses scientific name + title matching for Chinese content')

  // Clear existing content
  if (fs.existsSync(CONTENT_DIR)) {
    console.log('\nClearing existing content...')
    const dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)

    for (const dir of dirs) {
      const dirPath = path.join(CONTENT_DIR, dir)
      fs.rmSync(dirPath, { recursive: true })
    }
    console.log(`Removed ${dirs.length} directories`)
  }

  ensureDir(CONTENT_DIR)

  // Phase 1: Scrape English
  const { slugToData, sciNameToSlug } = await scrapeEnglish()

  console.log(`\n\nEnglish herbs scraped: ${slugToData.size}`)
  console.log(`Scientific name index: ${sciNameToSlug.size}`)

  // Phase 2: Scrape Chinese variants
  await scrapeChinese('zh-HK', slugToData, sciNameToSlug)
  await scrapeChinese('zh-CN', slugToData, sciNameToSlug)

  // Generate index
  console.log('\n\nGenerating index...')
  const herbDirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  const categories = {}
  for (const slug of herbDirs) {
    const enPath = path.join(CONTENT_DIR, slug, 'en.yaml')
    if (fs.existsSync(enPath)) {
      const content = fs.readFileSync(enPath, 'utf8')
      const catMatch = content.match(/^category:\s*"([^"]+)"/m)
      if (catMatch) {
        categories[catMatch[1]] = (categories[catMatch[1]] || 0) + 1
      }
    }
  }

  const indexPath = path.join(CONTENT_DIR, 'index.yaml')
  const indexYaml = `# Herbapedia Index\n# Auto-generated at ${new Date().toISOString()}\n\ntotal: ${herbDirs.length}\n\ncategories:\n${Object.entries(categories).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`
  fs.writeFileSync(indexPath, indexYaml)

  console.log('\n\nScraping complete!')
  console.log(`Total herb directories: ${herbDirs.length}`)
  console.log('Categories:', categories)
}

main().catch(console.error)
