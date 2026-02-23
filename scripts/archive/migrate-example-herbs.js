#!/usr/bin/env node
/**
 * Migrate exampleHerbs in TCM reference files from Chinese strings to @id references.
 *
 * Before: "exampleHerbs": ["人參", "當歸"]
 * After:  "exampleHerbs": [{"@id": "https://www.herbapedia.org/system/tcm/profile/ren-shen"}, ...]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..');

// Mapping of Chinese herb names to profile slugs
const CHINESE_TO_SLUG = {
  // Qi tonics
  "人參": "ren-shen",
  "人参": "ren-shen",
  "黨參": "dangshen",
  "党参": "dangshen",
  "黃耆": "huangqi",
  "黄芪": "huangqi",
  "白朮": "baizhu",
  "白术": "baizhu",
  "山藥": "shanyao",
  "山药": "shanyao",
  "甘草": "liquorice-root",
  "大棗": "da-zao",
  "大枣": "da-zao",

  // Blood tonics
  "當歸": "dang-gui",
  "当归": "dang-gui",
  "熟地黃": "shoudihuang",
  "熟地黄": "shoudihuang",
  "白芍": "bai-shao",
  "阿膠": "e-jiao",
  "阿胶": "e-jiao",
  "何首烏": "fleece-flower",
  "何首乌": "fleece-flower",
  "龍眼肉": "longyan-rou",
  "龙眼肉": "longyan-rou",

  // Yin tonics
  "沙參": "shashen",
  "沙参": "shashen",
  "麥冬": "maidong",
  "麦冬": "maidong",
  "天冬": "tiandong",
  "石斛": "shihu",
  "玉竹": "yuzhu",
  "百合": "baihe",
  "女貞子": "nuzhenzi",
  "墨旱蓮": "mohanlian",
  "墨旱莲": "mohanlian",
  "龜甲": "guijia-or-guiban",
  "龟甲": "guijia-or-guiban",
  "鱉甲": "bie-jia",
  "鳖甲": "bie-jia",

  // Yang tonics
  "鹿茸": "deer-antler",
  "肉蓯蓉": "roucongrong",
  "巴戟天": "bajitian",
  "淫羊藿": "horny-goat-weed",
  "仙茅": "xianmao",
  "補骨脂": "buguzhi",
  "补骨脂": "buguzhi",
  "益智仁": "yizhiren",
  "菟絲子": "tusizi",
  "菟丝子": "tusizi",
  "杜仲": "duzhong",
  "續斷": "xuduan",
  "续断": "xuduan",
  "鎖陽": "suoyang",
  "锁阳": "suoyang",

  // Release exterior
  "麻黃": "mahuang",
  "麻黄": "mahuang",
  "桂枝": "guizhi",
  "紫蘇葉": "zisuye",
  "紫苏叶": "zisuye",
  "荊芥": "jingjie",
  "防風": "fangfeng",
  "防风": "fangfeng",
  "羌活": "qianghuo",
  "白芷": "baizhi",
  "細辛": "xixin",
  "细辛": "xixin",
  "生薑": "sheng-jiang",
  "生姜": "sheng-jiang",
  "蔥白": "congbai",
  "葱白": "congbai",
  "菊花": "chrysanthemum",
  "薄荷": "mint",
  "牛蒡子": "niubangzi",
  "蟬蛻": "chantui",
  "蝉蜕": "chantui",
  "桑葉": "sangye",
  "桑叶": "sangye",
  "葛根": "gegen",
  "柴胡": "chaihu",
  "升麻": "shengma",

  // Clear heat
  "石膏": "shigao",
  "知母": "zhimu",
  "梔子": "zhizi",
  "栀子": "zhizi",
  "黃芩": "huangqin",
  "黄芩": "huangqin",
  "黃連": "huanglian",
  "黄连": "huanglian",
  "黃柏": "huangbo",
  "黄柏": "huangbo",
  "龍膽草": "longdancao",
  "龙胆草": "longdancao",
  "苦參": "kushen",
  "苦参": "kushen",
  "金銀花": "jinyinhua",
  "金银花": "jinyinhua",
  "連翹": "lianqiao",
  "连翘": "lianqiao",
  "蒲公英": "dandelion",
  "紫花地丁": "zihuadiding",
  "大青葉": "daqingye",
  "大青叶": "daqingye",
  "板藍根": "indigowoad-root-banlangen",
  "板蓝根": "indigowoad-root-banlangen",
  "魚腥草": "yuxingcao",
  "鱼腥草": "yuxingcao",
  "敗醬草": "baijiangcao",
  "败酱草": "baijiangcao",
  "白頭翁": "baitouweng",
  "白头翁": "baitouweng",
  "青蒿": "qinghao",
  "地骨皮": "digupi",
  "銀柴胡": "yinchaihu",
  "银柴胡": "yinchaihu",
  "胡黃連": "huhuanglian",
  "胡黄连": "huhuanglian",

  // Purging/downward draining
  "大黃": "dahuang",
  "大黄": "dahuang",
  "芒硝": "mangxiao",
  "番瀉葉": "fanxieye",
  "番泻叶": "fanxieye",
  "火麻仁": "huomaren",
  "郁李仁": "yuliren",
  "甘遂": "gansui",
  "大戟": "daji",
  "芫花": "yuanhua",
  "巴豆": "badou",
  "牽牛子": "qianniuzi",
  "牵牛子": "qianniuzi",

  // Wind-damp dispelling
  "獨活": "duhuo",
  "羌活": "qianghuo",
  "威靈仙": "weilingxian",
  "威灵仙": "weilingxian",
  "防己": "fangji",
  "秦艽": "qinjiao",
  "豨薟草": "xixiancao",
  "豨莶草": "xixiancao",
  "木瓜": "mugua",
  "桑寄生": "sangjisheng",
  "五加皮": "wujiapi",
  "白花蛇": "baihuashe",

  // Transform dampness
  "蒼朮": "cangzhu",
  "苍术": "cangzhu",
  "厚朴": "houpo",
  "藿香": "huoxiang",
  "佩蘭": "peilan",
  "佩兰": "peilan",
  "砂仁": "sharen",
  "白豆蔻": "baidoukou",
  "草豆蔻": "caodoukou",
  "草果": "caoguo",

  // Leach dampness
  "茯苓": "fuling",
  "豬苓": "zhuling",
  "猪苓": "zhuling",
  "澤瀉": "zexie",
  "泽泻": "zexie",
  "薏苡仁": "jobs-tears",
  "車前子": "cheqianzi",
  "车前子": "cheqianzi",
  "滑石": "huashi",
  "木通": "mutong",
  "通草": "tongcao",
  "金錢草": "jinqiancao",
  "金钱草": "jinqiancao",

  // Warm interior
  "附子": "fuzi",
  "乾薑": "ganjiang",
  "干姜": "ganjiang",
  "肉桂": "rougui",
  "吳茱萸": "wuzhuyu",
  "吴茱萸": "wuzhuyu",
  "小茴香": "xiaohuixiang",
  "丁香": "dingxiang",
  "高良薑": "gaoliangjiang",
  "高良姜": "gaoliangjiang",
  "胡椒": "hujiao",
  "花椒": "huajiao",

  // Regulate qi
  "陳皮": "tangerine-peel",
  "陈皮": "tangerine-peel",
  "青皮": "qingpi",
  "枳實": "zhishi",
  "枳实": "zhishi",
  "枳殼": "zhike",
  "枳壳": "zhike",
  "木香": "muxiang",
  "香附": "xiangfu",
  "烏藥": "wuyao",
  "乌药": "wuyao",
  "沉香": "chenxiang",
  "檀香": "tanxiang",
  "川楝子": "chuanlianzi",
  "薤白": "xiebai",
  "佛手": "foshou",
  "香櫞": "xiangyuan",
  "香橼": "xiangyuan",
  "玫瑰花": "meiguihua",

  // Digestive
  "山楂": "shanzha",
  "神曲": "shenqu",
  "麥芽": "maiya",
  "麦芽": "maiya",
  "穀芽": "guya",
  "谷芽": "guya",
  "萊菔子": "laifuzi",
  "雞內金": "jineijin",
  "鸡内金": "jineijin",

  // Hemostatic
  "三七": "sanqi",
  "白及": "baiji",
  "仙鶴草": "xianhecao",
  "仙鹤草": "xianhecao",
  "棕櫚炭": "zonglvtan",
  "棕榈炭": "zonglvtan",
  "血餘炭": "xueyutan",
  "血余炭": "xueyutan",
  "藕節": "oujie",
  "藕节": "oujie",
  "艾葉": "aiye",
  "艾叶": "aiye",
  "側柏葉": "cebaiye",
  "侧柏叶": "cebaiye",
  "槐花": "huaihua",
  "地榆": "diyu",

  // Blood quickening
  "丹參": "danshen",
  "丹参": "danshen",
  "川芎": "chuanxiong",
  "紅花": "honghua",
  "红花": "honghua",
  "桃仁": "taoren-or-peach-kernel",
  "益母草": "yimucao",
  "牛膝": "niuxi",
  "雞血藤": "jixueteng",
  "鸡血藤": "jixueteng",
  "王不留行": "wangbuliuxing",
  "澤蘭": "zelan",
  "泽兰": "zelan",
  "乳香": "ruxiang",
  "沒藥": "moyao",
  "没药": "moyao",
  "延胡索": "yanhusuo",
  "鬱金": "yujin",
  "郁金": "yujin",
  "薑黃": "jianghuang",
  "姜黄": "jianghuang",
  "莪朮": "ezhu",
  "莪术": "ezhu",
  "三棱": "sanleng",
  "水蛭": "shuizhi",
  "虻蟲": "mengchong",
  "虻虫": "mengchong",
  "土鱉蟲": "tubiechong",
  "土鳖虫": "tubiechong",

  // Cough/phlegm
  "杏仁": "xingren",
  "紫蘇子": "zisuzi",
  "紫苏子": "zisuzi",
  "百部": "baibu",
  "紫菀": "ziwan",
  "款冬花": "kuandonghua",
  "馬兜鈴": "madouling",
  "马兜铃": "madouling",
  "枇杷葉": "pipaye",
  "枇杷叶": "pipaye",
  "桑白皮": "sangbaipi",
  "葶藶子": "tinglizi",
  "葶苈子": "tinglizi",
  "半夏": "banxia",
  "天南星": "tiannanxing",
  "白附子": "baifuzi",
  "白芥子": "baijiezi",
  "皂莢": "zaojia",
  "皂荚": "zaojia",
  "旋覆花": "xuanfuhua",
  "白前": "baiqian",
  "前胡": "qianhu",
  "瓜蔞": "gualou",
  "瓜蒌": "gualou",
  "貝母": "beimu",
  "竹茹": "zhuru",
  "竹瀝": "zhuli",
  "竹沥": "zhuli",
  "天竺黃": "tianzhuhuang",
  "天竺黄": "tianzhuhuang",
  "海蛤殼": "haigeqiao",
  "海蛤壳": "haigeqiao",
  "海藻": "haizao",
  "昆布": "kunbu",
  "胖大海": "pangdahai",

  // Calm spirit
  "酸棗仁": "suanzaoren",
  "酸枣仁": "suanzaoren",
  "柏子仁": "baiziren",
  "遠志": "yuanzhi",
  "远志": "yuanzhi",
  "合歡皮": "hehuanpi",
  "合欢皮": "hehuanpi",
  "合歡花": "hehuanhua",
  "合欢花": "hehuanhua",
  "龍骨": "muli",
  "龙骨": "muli",
  "牡蠣": "muli",
  "牡蛎": "muli",
  "朱砂": "zhusha",
  "磁石": "cishi",
  "琥珀": "hupo",
  "珍珠母": "zhenzhumu",

  // Astringent
  "五味子": "wuweizi",
  "烏梅": "wumei",
  "五倍子": "wubeizi",
  "訶子": "hezi",
  "诃子": "hezi",
  "肉豆蔻": "roudoukou",
  "芡實": "qianshi",
  "芡实": "qianshi",
  "金櫻子": "jinyingzi",
  "金樱子": "jinyingzi",
  "蓮子": "lianzi",
  "莲子": "lianzi",
  "蓮鬚": "lianxu",
  "莲须": "lianxu",
  "龍骨": "muli",
  "龙骨": "muli",
  "牡蠣": "muli",
  "牡蛎": "muli",
  "赤石脂": "chishizhi",
  "禹餘糧": "yuyuliang",
  "禹余粮": "yuyuliang",
  "罌粟殼": "yingsuqiao",
  "罂粟壳": "yingsuqiao",
  "浮小麥": "fuxiaomai",
  "浮小麦": "fuxiaomai",
  "麻黃根": "mahuanggen",
  "麻黄根": "mahuanggen",
  "椿皮": "chunpi",
  "石榴皮": "shiliupi",
  "覆盆子": "fupenzi",
  "桑螵蛸": "sangpiaoxiao",
  "海螵蛸": "haipiaoxiao",

  // Liver calm
  "石決明": "shijueming",
  "石决明": "shijueming",
  "珍珠母": "zhenzhumu",
  "牡蠣": "muli",
  "牡蛎": "muli",
  "代赭石": "daizheshi",
  "刺蒺藜": "cijili",
  "羅布麻": "luobuma",
  "罗布麻": "luobuma",

  // Open orifices
  "麝香": "shexiang",
  "冰片": "bingpian",
  "蘇合香": "suhexiang",
  "苏合香": "suhexiang",
  "石菖蒲": "changpu",
  "牛黃": "niuhuang",
  "牛黄": "niuhuang",

  // Wind extinguishing
  "羚羊角": "lingyangjiao",
  "鉤藤": "gouteng",
  "钩藤": "gouteng",
  "天麻": "tianma",
  "珍珠": "zhenzhu",
  "全蠍": "quanxie",
  "全蝎": "quanxie",
  "蜈蚣": "wugong",
  "殭蠶": "jiangcan",
  "僵蚕": "jiangcan",
  "地龍": "dilong",
  "地龙": "dilong",

  // Exterior-releasing
  "蟬蛻": "chantui",
  "蝉蜕": "chantui",
  "浮萍": "fuping",
  "山茱萸": "shanzhuyu",
  "生地黃": "dihuang",
  "生地黄": "dihuang",
  "枸杞子": "gouqizi",
  "龜板": "guijia-or-guiban",
  "龟板": "guijia-or-guiban",
  "淡豆豉": "dandouchi"
};

const BASE_IRI = 'https://www.herbapedia.org/system/tcm/profile/';

function migrateExampleHerbsInFile(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;
  let missingMappings = [];

  function migrateArray(arr) {
    if (!Array.isArray(arr)) return arr;

    return arr.map(item => {
      // Already an @id reference
      if (typeof item === 'object' && item['@id']) {
        return item;
      }

      // String that looks like an IRI
      if (typeof item === 'string' && item.startsWith('http')) {
        return { '@id': item };
      }

      // Chinese herb name
      if (typeof item === 'string') {
        const slug = CHINESE_TO_SLUG[item];
        if (slug) {
          modified = true;
          return { '@id': BASE_IRI + slug };
        } else {
          missingMappings.push(item);
          return item; // Keep as-is for now
        }
      }

      return item;
    });
  }

  function processObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          processObject(item);
        }
        return item;
      });
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) {
        if (key === 'exampleHerbs' && Array.isArray(obj[key])) {
          obj[key] = migrateArray(obj[key]);
        } else if (typeof obj[key] === 'object') {
          processObject(obj[key]);
        }
      }
    }
  }

  processObject(content);

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  }

  return { modified, missingMappings };
}

// Process reference files
const referenceDir = path.join(DATA_DIR, 'systems', 'tcm', 'reference');
const files = ['natures.jsonld', 'flavors.jsonld', 'categories.jsonld'];

let totalModified = 0;
const allMissingMappings = new Set();

for (const file of files) {
  const filePath = path.join(referenceDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    continue;
  }

  const result = migrateExampleHerbsInFile(filePath);

  if (result.modified) {
    totalModified++;
    console.log(`Updated: ${file}`);
  } else {
    console.log(`No changes: ${file}`);
  }

  if (result.missingMappings.length > 0) {
    result.missingMappings.forEach(m => allMissingMappings.add(m));
  }
}

console.log('\n=== Summary ===');
console.log(`Files updated: ${totalModified}`);

if (allMissingMappings.size > 0) {
  console.log('\n=== Missing Mappings ===');
  for (const m of allMissingMappings) {
    console.log(`  "${m}": "",`);
  }
  console.log(`\nTotal missing: ${allMissingMappings.size}`);
}
