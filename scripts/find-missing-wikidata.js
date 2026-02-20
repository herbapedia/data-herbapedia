import fs from 'fs';
import path from 'path';

// Get all TCM profiles
const tcmDir = './systems/tcm/herbs';
const profiles = fs.readdirSync(tcmDir);

const withoutWikidata = [];

for (const slug of profiles) {
  const profilePath = path.join(tcmDir, slug, 'profile.jsonld');
  if (fs.existsSync(profilePath)) {
    const content = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    const hasWikidata = content.sameAs && content.sameAs.some(link =>
      (typeof link === 'string' ? link : link['@id'] || '').includes('wikidata')
    );
    if (!hasWikidata) {
      withoutWikidata.push({
        slug,
        chineseName: content.chineseName,
        pinyin: content.pinyin,
        scientificName: content.scientificName
      });
    }
  }
}

console.log('TCM profiles without Wikidata links:', withoutWikidata.length);
console.log(JSON.stringify(withoutWikidata, null, 2));
