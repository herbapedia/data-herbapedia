#!/usr/bin/env node
/**
 * Add NCBI Taxonomy IDs to botanical species.
 *
 * This script adds ncbiTaxonID to species based on curated mappings
 * from NCBI Taxonomy database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

// NCBI Taxonomy ID mappings for medicinal plants
const NCBI_TAXON_IDS = {
  // Major TCM herbs
  'Panax ginseng': { ncbiTaxonID: '4054', commonName: 'Asian ginseng' },
  'Panax notoginseng': { ncbiTaxonID: '41295', commonName: 'Notoginseng' },
  'Panax quinquefolius': { ncbiTaxonID: '261462', commonName: 'American ginseng' },
  'Panax quinquefolium': { ncbiTaxonID: '261462', commonName: 'American ginseng' },
  'Zingiber officinale': { ncbiTaxonID: '97728', commonName: 'Ginger' },
  'Curcuma longa': { ncbiTaxonID: '13348', commonName: 'Turmeric' },
  'Ginkgo biloba': { ncbiTaxonID: '3311', commonName: 'Ginkgo' },
  'Allium sativum': { ncbiTaxonID: '4682', commonName: 'Garlic' },
  'Angelica sinensis': { ncbiTaxonID: '1177710', commonName: 'Dong quai' },
  'Angelica pubescens': { ncbiTaxonID: '4713067', commonName: 'Du huo' },
  'Astragalus membranaceus': { ncbiTaxonID: '58190', commonName: 'Astragalus' },
  'Cinnamomum cassia': { ncbiTaxonID: '676126', commonName: 'Cinnamon' },
  'Cinnamomum verum': { ncbiTaxonID: '855332', commonName: 'Ceylon cinnamon' },
  'Cistanche deserticola': { ncbiTaxonID: '1336416', commonName: 'Rou Cong Rong' },
  'Cordyceps sinensis': { ncbiTaxonID: '60485', commonName: 'Cordyceps' },
  'Cordyceps militaris': { ncbiTaxonID: '60514', commonName: 'Caterpillar fungus' },
  'Dendrobium nobile': { ncbiTaxonID: '90717', commonName: 'Shi hu' },
  'Dioscorea opposita': { ncbiTaxonID: '51277', commonName: 'Chinese yam' },
  'Eucommia ulmoides': { ncbiTaxonID: '52420', commonName: 'Du zhong' },
  'Evodia rutaecarpa': { ncbiTaxonID: '53418', commonName: 'Wu Zhu Yu' },
  'Foeniculum vulgare': { ncbiTaxonID: '48570', commonName: 'Fennel' },
  'Forsythia suspensa': { ncbiTaxonID: '100394', commonName: 'Lian qiao' },
  'Ganoderma lucidum': { ncbiTaxonID: '60497', commonName: 'Lingzhi/Reishi' },
  'Glycyrrhiza glabra': { ncbiTaxonID: '54579', commonName: 'Licorice' },
  'Glycyrrhiza uralensis': { ncbiTaxonID: '74639', commonName: 'Gan cao' },
  'Ligustrum lucidum': { ncbiTaxonID: '297092', commonName: 'Nu zhen zi' },
  'Lonicera japonica': { ncbiTaxonID: '106188', commonName: 'Jin yin hua' },
  'Lycium barbarum': { ncbiTaxonID: '114203', commonName: 'Goji berry' },
  'Lycium chinense': { ncbiTaxonID: '47288', commonName: 'Gou qi zi' },
  'Magnolia officinalis': { ncbiTaxonID: '68052', commonName: 'Hou po' },
  'Mentha haplocalyx': { ncbiTaxonID: '5341393', commonName: 'Mint' },
  'Mentha piperita': { ncbiTaxonID: '66808', commonName: 'Peppermint' },
  'Nelumbo nucifera': { ncbiTaxonID: '6426', commonName: 'Lotus' },
  'Ophiopogon japonicus': { ncbiTaxonID: '2753592', commonName: 'Mai men dong' },
  'Paeonia lactiflora': { ncbiTaxonID: '44173', commonName: 'Bai shao' },
  'Paeonia suffruticosa': { ncbiTaxonID: '158875', commonName: 'Mudan pi' },
  'Pogostemon cablin': { ncbiTaxonID: '286587', commonName: 'Patchouli' },
  'Polygonum multiflorum': { ncbiTaxonID: '159023', commonName: 'He shou wu' },
  'Rheum palmatum': { ncbiTaxonID: '90599', commonName: 'Da huang' },
  'Salvia miltiorrhiza': { ncbiTaxonID: '76838', commonName: 'Dan shen' },
  'Saposhnikovia divaricata': { ncbiTaxonID: '134611', commonName: 'Fang feng' },
  'Schisandra chinensis': { ncbiTaxonID: '161028', commonName: 'Wu wei zi' },
  'Stephania tetrandra': { ncbiTaxonID: '41133', commonName: 'Han fang ji' },

  // Western herbs
  'Aloe vera': { ncbiTaxonID: '140237', commonName: 'Aloe' },
  'Aloe barbadensis': { ncbiTaxonID: '140237', commonName: 'Aloe' },
  'Arctium lappa': { ncbiTaxonID: '53646', commonName: 'Burdock' },
  'Arnica montana': { ncbiTaxonID: '40964', commonName: 'Arnica' },
  'Boswellia serrata': { ncbiTaxonID: '851893', commonName: 'Frankincense' },
  'Camellia sinensis': { ncbiTaxonID: '4442', commonName: 'Tea' },
  'Echinacea angustifolia': { ncbiTaxonID: '164788', commonName: 'Echinacea' },
  'Echinacea purpurea': { ncbiTaxonID: '424708', commonName: 'Echinacea' },
  'Eucalyptus globulus': { ncbiTaxonID: '39312', commonName: 'Eucalyptus' },
  'Hypericum perforatum': { ncbiTaxonID: '129016', commonName: 'St. John\'s wort' },
  'Lavandula angustifolia': { ncbiTaxonID: '95603', commonName: 'Lavender' },
  'Matricaria chamomilla': { ncbiTaxonID: '37290', commonName: 'Chamomile' },
  'Melissa officinalis': { ncbiTaxonID: '240184', commonName: 'Lemon balm' },
  'Oenothera biennis': { ncbiTaxonID: '66334', commonName: 'Evening primrose' },
  'Plantago ovata': { ncbiTaxonID: '110514', commonName: 'Psyllium' },
  'Rosa canina': { ncbiTaxonID: '74629', commonName: 'Rose hip' },
  'Rosmarinus officinalis': { ncbiTaxonID: '39367', commonName: 'Rosemary' },
  'Salvia officinalis': { ncbiTaxonID: '79468', commonName: 'Sage' },
  'Silybum marianum': { ncbiTaxonID: '50469', commonName: 'Milk thistle' },
  'Taraxacum officinale': { ncbiTaxonID: '50710', commonName: 'Dandelion' },
  'Thymus vulgaris': { ncbiTaxonID: '49995', commonName: 'Thyme' },
  'Trifolium pratense': { ncbiTaxonID: '46978', commonName: 'Red clover' },
  'Urtica dioica': { ncbiTaxonID: '27461', commonName: 'Nettle' },
  'Valeriana officinalis': { ncbiTaxonID: '129271', commonName: 'Valerian' },
  'Vitex agnus-castus': { ncbiTaxonID: '48488', commonName: 'Chasteberry' },
  'Withania somnifera': { ncbiTaxonID: '78361', commonName: 'Ashwagandha' },

  // Fungi
  'Trametes versicolor': { ncbiTaxonID: '54076', commonName: 'Turkey tail' },
  'Inonotus obliquus': { ncbiTaxonID: '101999', commonName: 'Chaga' },
  'Agaricus bisporus': { ncbiTaxonID: '5341', commonName: 'Button mushroom' },

  // Additional species with name variations
  'Alisma plantago-aquatica': { ncbiTaxonID: '51197', commonName: 'Water plantain' },
  'Atractylodes macrocephala': { ncbiTaxonID: '1265513', commonName: 'Bai zhu' },
  'Atractylodes lancea': { ncbiTaxonID: '92328', commonName: 'Cang zhu' },
  'Bupleurum chinense': { ncbiTaxonID: '32204', commonName: 'Chai hu' },
  'Citrus aurantium': { ncbiTaxonID: '74649', commonName: 'Bitter orange' },
  'Citrus Aurantium': { ncbiTaxonID: '74649', commonName: 'Bitter orange' },
  'Coptis chinensis': { ncbiTaxonID: '58371', commonName: 'Huang lian' },
  'Cornus officinalis': { ncbiTaxonID: '274497', commonName: 'Shan zhu yu' },
  'Cuscuta chinensis': { ncbiTaxonID: '228375', commonName: 'Tu si zi' },
  'Epimedium brevicornum': { ncbiTaxonID: '286451', commonName: 'Yin yang huo' },
  'Fritillaria cirrhosa': { ncbiTaxonID: '433174', commonName: 'Chuan bei mu' },
  'Gardenia jasminoides': { ncbiTaxonID: '47675', commonName: 'Zhi zi' },
  'Hordeum vulgare': { ncbiTaxonID: '112509', commonName: 'Barley' },
  'Isatis tinctoria': { ncbiTaxonID: '82633', commonName: 'Indigo woad' },
  'Lilium brownii': { ncbiTaxonID: '337019', commonName: 'Bai he' },
  'Morinda officinalis': { ncbiTaxonID: '131958', commonName: 'Ba ji tian' },
  'Morus alba': { ncbiTaxonID: '4518', commonName: 'White mulberry' },
  'Phytolacca acinosa': { ncbiTaxonID: '259036', commonName: 'Shang lu' },
  'Platycodon grandiflorum': { ncbiTaxonID: '32241', commonName: 'Jie geng' },
  'Platycodon grandiflorus': { ncbiTaxonID: '32241', commonName: 'Jie geng' },
  'Polygala tenuifolia': { ncbiTaxonID: '115880', commonName: 'Yuan zhi' },
  'Poria cocos': { ncbiTaxonID: '68495', commonName: 'Fu ling' },
  'Prunus persica': { ncbiTaxonID: '3764', commonName: 'Peach' },
  'Prunus armeniaca': { ncbiTaxonID: '29696', commonName: 'Apricot' },
  'Pueraria lobata': { ncbiTaxonID: '108638', commonName: 'Ge gen' },
  'Rehmannia glutinosa': { ncbiTaxonID: '29695', commonName: 'Di huang' },
  'Rheum officinale': { ncbiTaxonID: '304461', commonName: 'Da huang' },
  'Sargassum fusiforme': { ncbiTaxonID: '13077', commonName: 'Hai zao' },
  'Sophora flavescens': { ncbiTaxonID: '149456', commonName: 'Ku shen' },
  'Triticum aestivum': { ncbiTaxonID: '4565', commonName: 'Wheat' },
  'Tussilago farfara': { ncbiTaxonID: '49997', commonName: 'Kuan dong hua' },
  'Uncaria rhynchophylla': { ncbiTaxonID: '58241', commonName: 'Gou teng' },
  'Ziziphus jujuba': { ncbiTaxonID: '290995', commonName: 'Da zao' },
  'Zea mays': { ncbiTaxonID: '4577', commonName: 'Corn' },

  // Additional Western herbs
  'Argania spinosa': { ncbiTaxonID: '58326', commonName: 'Argan' },
  'Asparagus cochinchinensis': { ncbiTaxonID: '468842', commonName: 'Tian men dong' },
  'Vaccinium myrtillus': { ncbiTaxonID: '41608', commonName: 'Bilberry' },
  'Vaccinium macrocarpon': { ncbiTaxonID: '232072', commonName: 'Cranberry' },
  'Borago officinalis': { ncbiTaxonID: '46006', commonName: 'Borage' },
  'Psoralea corylifolia': { ncbiTaxonID: '898019', commonName: 'Bu gu zhi' },
  'Amomum villosum': { ncbiTaxonID: '96610', commonName: 'Sha ren' },
  'Acorus calamus': { ncbiTaxonID: '449212', commonName: 'Chang pu' },
  'Acorus Tatarinowii': { ncbiTaxonID: '77123', commonName: 'Shi chang pu' },
  'Artemisia argyi': { ncbiTaxonID: '675496', commonName: 'Ai ye' },
  'Ligusticum striatum': { ncbiTaxonID: '43215', commonName: 'Chuan xiong' },
  'Syzygium aromaticum': { ncbiTaxonID: '57723', commonName: 'Clove' },
  'Chrysanthemum morifolium': { ncbiTaxonID: '54116', commonName: 'Ju hua' },
  'Glehnia littoralis': { ncbiTaxonID: '2754404', commonName: 'Bei sha shen' },
  'Platycladus orientalis': { ncbiTaxonID: '3369', commonName: 'Bai zi ren' },
  'Platycladus Orientalis': { ncbiTaxonID: '3369', commonName: 'Bai zi ren' },
  'Sesamum indicum': { ncbiTaxonID: '3821', commonName: 'Sesame' },

  // Animal products
  'Cervus nippon': { ncbiTaxonID: '31893', commonName: 'Sika deer' },
  'Apis cerana': { ncbiTaxonID: '74594', commonName: 'Honey bee' },
  'Bos taurus': { ncbiTaxonID: '9913', commonName: 'Cattle' },

  // Additional Ayurvedic herbs
  'Andrographis paniculata': { ncbiTaxonID: '197214', commonName: 'Kalamegh' },
  'Asparagus racemosus': { ncbiTaxonID: '450751', commonName: 'Shatavari' },
  'Azadirachta indica': { ncbiTaxonID: '36325', commonName: 'Neem' },
  'Bacopa monnieri': { ncbiTaxonID: '41295', commonName: 'Brahmi' },
  'Centella asiatica': { ncbiTaxonID: '4040', commonName: 'Gotu kola' },
  'Emblica officinalis': { ncbiTaxonID: '163220', commonName: 'Amla' },
  'Gymnema sylvestre': { ncbiTaxonID: '216716', commonName: 'Gurmar' },
  'Piper longum': { ncbiTaxonID: '159218', commonName: 'Pippali' },
  'Piper nigrum': { ncbiTaxonID: '109445', commonName: 'Black pepper' },
  'Tinospora cordifolia': { ncbiTaxonID: '168178', commonName: 'Guduchi' },
  'Tribulus terrestris': { ncbiTaxonID: '47925', commonName: 'Gokshura' },

  // Additional species with variations
  'Taraxacum Officinale': { ncbiTaxonID: '50710', commonName: 'Dandelion' },
  'Codonopsis pilosula': { ncbiTaxonID: '115663', commonName: 'Dang shen' },
  'Cervus nippon Temminck': { ncbiTaxonID: '31893', commonName: 'Sika deer' },
  'Reynoutria multiflora': { ncbiTaxonID: '15389391', commonName: 'He shou wu' },
  'Garcinia cambogia': { ncbiTaxonID: '50507', commonName: 'Garcinia' },
  'Garcinia Cambogia': { ncbiTaxonID: '50507', commonName: 'Garcinia' },
  'Vitis vinifera': { ncbiTaxonID: '29760', commonName: 'Grape' },
  'Camellia Sinensis': { ncbiTaxonID: '4442', commonName: 'Green tea' },
  'Crataegus monogyna': { ncbiTaxonID: '93934', commonName: 'Hawthorn' },
  'Albizia julibrissin': { ncbiTaxonID: '37508', commonName: 'He huan hua' },
  'Gynostemma pentaphyllum': { ncbiTaxonID: '181266', commonName: 'Jiao gu lan' },
  'Rosa laevigata': { ncbiTaxonID: '74630', commonName: 'Jin ying zi' },
  'Coix lacryma-jobi': { ncbiTaxonID: '4528', commonName: 'Yi yi ren' },
  'Simmondsia chinensis': { ncbiTaxonID: '39909', commonName: 'Jojoba' },
  'Amorphophallus konjac': { ncbiTaxonID: '57790', commonName: 'Ju ruo' },
  'Vaccinium Cyanococcus': { ncbiTaxonID: '254167', commonName: 'Blueberry' },
  'Atractylodes lancea': { ncbiTaxonID: '92328', commonName: 'Cang zhu' },
  'Sesamum indicum': { ncbiTaxonID: '3821', commonName: 'Sesame' },
  'Sesami Nigrum': { ncbiTaxonID: '3821', commonName: 'Black sesame' },

  // Additional Ayurvedic herbs
  'Acorus calamus': { ncbiTaxonID: '449212', commonName: 'Vacha' },
  'Adhatoda vasica': { ncbiTaxonID: '897017', commonName: 'Vasaka' },
  'Andrographis paniculata': { ncbiTaxonID: '197214', commonName: 'Kalamegh' },
  'Asparagus racemosus': { ncbiTaxonID: '450751', commonName: 'Shatavari' },
  'Azadirachta indica': { ncbiTaxonID: '36325', commonName: 'Neem' },
  'Bacopa monnieri': { ncbiTaxonID: '41295', commonName: 'Brahmi' },
  'Boerhavia diffusa': { ncbiTaxonID: '337754', commonName: 'Punarnava' },
  'Brahmi': { ncbiTaxonID: '41295', commonName: 'Brahmi' },
  'Butea monosperma': { ncbiTaxonID: '262691', commonName: 'Palash' },
  'Centella asiatica': { ncbiTaxonID: '4040', commonName: 'Gotu kola' },
  'Commiphora mukul': { ncbiTaxonID: '242483', commonName: 'Guggul' },
  'Emblica officinalis': { ncbiTaxonID: '163220', commonName: 'Amla' },
  'Gymnema sylvestre': { ncbiTaxonID: '216716', commonName: 'Gurmar' },
  'Hemidesmus indicus': { ncbiTaxonID: '552990', commonName: 'Anantamul' },
  'Mucuna pruriens': { ncbiTaxonID: '29871', commonName: 'Kapikachhu' },
  'Phyllanthus niruri': { ncbiTaxonID: '322705', commonName: 'Bhumyamalaki' },
  'Piper longum': { ncbiTaxonID: '159218', commonName: 'Pippali' },
  'Piper nigrum': { ncbiTaxonID: '109445', commonName: 'Black pepper' },
  'Plumbago zeylanica': { ncbiTaxonID: '112098', commonName: 'Chitrak' },
  'Semecarpus anacardium': { ncbiTaxonID: '1181629', commonName: 'Bhallataka' },
  'Sida cordifolia': { ncbiTaxonID: '267749', commonName: 'Bala' },
  'Tinospora cordifolia': { ncbiTaxonID: '168178', commonName: 'Guduchi' },
  'Withania somnifera': { ncbiTaxonID: '78361', commonName: 'Ashwagandha' },

  // More plant species
  'Eclipta prostrata': { ncbiTaxonID: '161734', commonName: 'Mo han lian' },
  'Achyranthes bidentata': { ncbiTaxonID: '55777', commonName: 'Niu xi' },
  'Orobanche coerulescens': { ncbiTaxonID: '953942', commonName: 'Lie dang' },
  'Eupatorium fortunei': { ncbiTaxonID: '1170162', commonName: 'Pei lan' },
  'Bistorta officinalis': { ncbiTaxonID: '144965', commonName: 'Quan shen' },
  'Rhodiola rosea': { ncbiTaxonID: '32824', commonName: 'Hong jing tian' },
  'Salvia rosmarinus': { ncbiTaxonID: '39367', commonName: 'Rosemary' },
  'Serenoa repens': { ncbiTaxonID: '47030', commonName: 'Saw palmetto' },
  'Crataegus pinnatifida': { ncbiTaxonID: '134311', commonName: 'Shan zha' },
  'Belamcanda chinensis': { ncbiTaxonID: '51221', commonName: 'She gan' },
  'Actaea heracleifolia': { ncbiTaxonID: '2733085', commonName: 'Sheng ma' },
  'Glycine max': { ncbiTaxonID: '3847', commonName: 'Soy' },
  'Ziziphus jujuba var spinosa': { ncbiTaxonID: '378816', commonName: 'Suan zao ren' },
  'Cynomorium coccineum': { ncbiTaxonID: '384556', commonName: 'Suo yang' },
  'Citrus reticulata': { ncbiTaxonID: '534462', commonName: 'Chen pi' },
  'Gastrodia elata': { ncbiTaxonID: '115989', commonName: 'Tian ma' },
  'Paeonia Suffruticosa': { ncbiTaxonID: '158875', commonName: 'Mu dan pi' },
  'Paeonia suffruticosa': { ncbiTaxonID: '158875', commonName: 'Mu dan pi' },
  'Paeonia lactiflora pall': { ncbiTaxonID: '44173', commonName: 'Bai shao' },
  'Salix Alba': { ncbiTaxonID: '3761', commonName: 'White willow' },
  'Salix alba': { ncbiTaxonID: '3761', commonName: 'White willow' },
  'Dioscorea Villosa': { ncbiTaxonID: '254167', commonName: 'Wild yam' },
  'Dioscorea villosa': { ncbiTaxonID: '254167', commonName: 'Wild yam' },
  'Magnolia denudata': { ncbiTaxonID: '33992', commonName: 'Xin yi hua' },
  'Perilla frutescens': { ncbiTaxonID: '126598', commonName: 'Zi su ye' },
  'Dictyophora indusiata': { ncbiTaxonID: '110193', commonName: 'Zhu sun' },
  'Mentha × piperita': { ncbiTaxonID: '66808', commonName: 'Peppermint' },
  'Mentha piperita': { ncbiTaxonID: '66808', commonName: 'Peppermint' },

  // Animal products
  'Bombyx mori': { ncbiTaxonID: '7091', commonName: 'Silkworm' },
  'Crassostrea gigas': { ncbiTaxonID: '29159', commonName: 'Pacific oyster' },
};

const SPECIES_DIR = path.join(DATA_DIR, 'entities', 'botanical', 'species');

function addNcbiIds() {
  let updated = 0;
  let skipped = 0;

  const slugs = fs.readdirSync(SPECIES_DIR).filter(f => {
    return fs.statSync(path.join(SPECIES_DIR, f)).isDirectory();
  });

  for (const slug of slugs) {
    const filePath = path.join(SPECIES_DIR, slug, 'entity.jsonld');
    if (!fs.existsSync(filePath)) continue;

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const scientificName = content.scientificName;

    if (!scientificName) {
      skipped++;
      continue;
    }

    // Check if ncbiTaxonID already exists
    if (content.ncbiTaxonID) {
      skipped++;
      continue;
    }

    const ids = NCBI_TAXON_IDS[scientificName];
    if (ids) {
      content.ncbiTaxonID = ids.ncbiTaxonID;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
      console.log(`Added NCBI ${ids.ncbiTaxonID} to ${slug} (${ids.commonName})`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

addNcbiIds();
