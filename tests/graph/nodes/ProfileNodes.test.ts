/**
 * Unit Tests for Profile Node Classes
 *
 * Tests TcmProfileNode, AyurvedaProfileNode, WesternProfileNode, and VocabularyNode.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import {
  TcmProfileNode,
  TcmProfileNodeBuilder,
  AyurvedaProfileNode,
  AyurvedaProfileNodeBuilder,
  WesternProfileNode,
  WesternProfileNodeBuilder,
  VocabularyNode,
  VocabularyNodeBuilder,
} from '../../../src/graph/nodes/ProfileNodes.js'
import { NodeType } from '../../../src/graph/types.js'

describe('TcmProfileNode', () => {
  describe('TcmProfileNodeBuilder', () => {
    it('should build a TCM profile with required fields', () => {
      const node = TcmProfileNode.builder()
        .slug('ren-shen')
        .name({ en: 'Ginseng Root', zh: '人蔘' })
        .pinyin('Rén Shēn')
        .derivedFrom('https://www.herbapedia.org/graph/species/panax-ginseng#root')
        .build()

      expect(node.slug).to.equal('ren-shen')
      expect(node.pinyin).to.equal('Rén Shēn')
      expect(node['@id']).to.include('/profile/tcm/ren-shen')
    })

    it('should build with TCM vocabulary references', () => {
      const node = TcmProfileNode.builder()
        .slug('ren-shen')
        .name({ en: 'Ginseng Root' })
        .pinyin('Rén Shēn')
        .derivedFrom('https://www.herbapedia.org/graph/species/panax-ginseng#root')
        .hasNature('https://www.herbapedia.org/graph/vocab/tcm/nature/warm')
        .addFlavor('https://www.herbapedia.org/graph/vocab/tcm/flavor/sweet')
        .addFlavor('https://www.herbapedia.org/graph/vocab/tcm/flavor/bitter')
        .addMeridian('https://www.herbapedia.org/graph/vocab/tcm/meridian/spleen')
        .addMeridian('https://www.herbapedia.org/graph/vocab/tcm/meridian/lung')
        .hasCategory('https://www.herbapedia.org/graph/vocab/tcm/category/tonify-qi')
        .build()

      expect(node.hasNature).to.exist
      expect(node.hasFlavor).to.have.lengthOf(2)
      expect(node.entersMeridian).to.have.lengthOf(2)
      expect(node.hasCategory).to.exist
    })

    it('should build with functions and usage', () => {
      const node = TcmProfileNode.builder()
        .slug('ren-shen')
        .name({ en: 'Ginseng Root' })
        .pinyin('Rén Shēn')
        .derivedFrom('https://test.org/species/1')
        .tcmFunctions({ en: 'Tonifies Qi', zh: '大補元氣' })
        .tcmTraditionalUsage({ en: 'For Qi deficiency', zh: '用於氣虛' })
        .tcmModernResearch({ en: 'Research shows...', zh: '研究表明...' })
        .build()

      expect(node.tcmFunctions).to.deep.equal({ en: 'Tonifies Qi', zh: '大補元氣' })
      expect(node.tcmTraditionalUsage).to.exist
      expect(node.tcmModernResearch).to.exist
    })
  })

  describe('TcmProfileNode', () => {
    it('should have correct type', () => {
      const node = TcmProfileNode.builder()
        .slug('ren-shen')
        .name({ en: 'Ginseng Root' })
        .pinyin('Rén Shēn')
        .derivedFrom('https://test.org/species/1')
        .build()

      expect(node['@type']).to.include('herbapedia:TcmHerb')
    })
  })
})

describe('AyurvedaProfileNode', () => {
  describe('AyurvedaProfileNodeBuilder', () => {
    it('should build an Ayurveda profile with required fields', () => {
      const node = AyurvedaProfileNode.builder()
        .slug('ashwagandha')
        .name({ en: 'Ashwagandha', sa: 'अश्वगन्धा' })
        .sanskritName('Aśvagandhā')
        .derivedFrom('https://www.herbapedia.org/graph/species/withania-somnifera#root')
        .build()

      expect(node.slug).to.equal('ashwagandha')
      expect(node.sanskritName).to.equal('Aśvagandhā')
      expect(node['@id']).to.include('/profile/ayurveda/ashwagandha')
    })

    it('should build with Ayurveda vocabulary references', () => {
      const node = AyurvedaProfileNode.builder()
        .slug('ashwagandha')
        .name({ en: 'Ashwagandha' })
        .derivedFrom('https://test.org/species/1')
        .addDosha('https://www.herbapedia.org/graph/vocab/ayurveda/dosha/vata')
        .addDosha('https://www.herbapedia.org/graph/vocab/ayurveda/dosha/kapha')
        .addRasa('https://www.herbapedia.org/graph/vocab/ayurveda/rasa/bitter')
        .addRasa('https://www.herbapedia.org/graph/vocab/ayurveda/rasa/astringent')
        .addGuna('https://www.herbapedia.org/graph/vocab/ayurveda/guna/light')
        .hasVirya('https://www.herbapedia.org/graph/vocab/ayurveda/virya/heating')
        .hasVipaka('https://www.herbapedia.org/graph/vocab/ayurveda/vipaka/pungent')
        .build()

      expect(node.effectsDosha).to.have.lengthOf(2)
      expect(node.hasRasa).to.have.lengthOf(2)
      expect(node.hasGuna).to.have.lengthOf(1)
      expect(node.hasVirya).to.exist
      expect(node.hasVipaka).to.exist
    })

    it('should build with usage information', () => {
      const node = AyurvedaProfileNode.builder()
        .slug('ashwagandha')
        .name({ en: 'Ashwagandha' })
        .derivedFrom('https://test.org/species/1')
        .ayurvedaTraditionalUsage({ en: 'Used as adaptogen' })
        .ayurvedaModernResearch({ en: 'Research on stress relief' })
        .build()

      expect(node.ayurvedaTraditionalUsage).to.exist
      expect(node.ayurvedaModernResearch).to.exist
    })
  })

  describe('AyurvedaProfileNode', () => {
    it('should have correct type', () => {
      const node = AyurvedaProfileNode.builder()
        .slug('ashwagandha')
        .name({ en: 'Ashwagandha' })
        .derivedFrom('https://test.org/species/1')
        .build()

      expect(node['@type']).to.include('herbapedia:AyurvedaDravya')
    })
  })
})

describe('WesternProfileNode', () => {
  describe('WesternProfileNodeBuilder', () => {
    it('should build a Western profile with required fields', () => {
      const node = WesternProfileNode.builder()
        .slug('ginger')
        .name({ en: 'Ginger' })
        .commonName('Ginger')
        .derivedFrom('https://www.herbapedia.org/graph/species/zingiber-officinale#rhizome')
        .build()

      expect(node.slug).to.equal('ginger')
      expect(node.commonName).to.equal('Ginger')
      expect(node['@id']).to.include('/profile/western/ginger')
    })

    it('should build with Western herbal properties', () => {
      const node = WesternProfileNode.builder()
        .slug('ginger')
        .name({ en: 'Ginger' })
        .derivedFrom('https://test.org/species/1')
        .addAction('https://www.herbapedia.org/graph/western/action/carminative')
        .addAction('https://www.herbapedia.org/graph/western/action/antiemetic')
        .addOrganAffinity('https://www.herbapedia.org/graph/western/organ/digestive')
        .energetics('warming')
        .build()

      expect(node.hasAction).to.have.lengthOf(2)
      expect(node.hasOrganAffinity).to.have.lengthOf(1)
      expect(node.energetics).to.equal('warming')
    })

    it('should build with usage information', () => {
      const node = WesternProfileNode.builder()
        .slug('ginger')
        .name({ en: 'Ginger' })
        .derivedFrom('https://test.org/species/1')
        .westernTraditionalUsage({ en: 'Used for nausea and digestion' })
        .westernModernResearch({ en: 'Clinical studies show effectiveness for nausea' })
        .build()

      expect(node.westernTraditionalUsage).to.exist
      expect(node.westernModernResearch).to.exist
    })
  })

  describe('WesternProfileNode', () => {
    it('should have correct type', () => {
      const node = WesternProfileNode.builder()
        .slug('ginger')
        .name({ en: 'Ginger' })
        .derivedFrom('https://test.org/species/1')
        .build()

      expect(node['@type']).to.include('herbapedia:WesternHerb')
    })
  })
})

describe('VocabularyNode', () => {
  describe('VocabularyNodeBuilder', () => {
    it('should build a vocabulary term', () => {
      const node = VocabularyNode.builder(NodeType.TCM_FLAVOR)
        .slug('sweet')
        .value('sweet')
        .prefLabel({ en: 'Sweet', zh: '甘' })
        .build()

      expect(node.slug).to.equal('sweet')
      expect(node.value).to.equal('sweet')
      expect(node.prefLabel).to.deep.equal({ en: 'Sweet', zh: '甘' })
    })

    it('should generate correct IRI for TCM flavor', () => {
      const node = VocabularyNode.builder(NodeType.TCM_FLAVOR)
        .slug('sweet')
        .value('sweet')
        .prefLabel({ en: 'Sweet' })
        .build()

      expect(node['@id']).to.include('/vocab/tcm/flavor/sweet')
    })

    it('should generate correct IRI for TCM nature', () => {
      const node = VocabularyNode.builder(NodeType.TCM_NATURE)
        .slug('warm')
        .value('warm')
        .prefLabel({ en: 'Warm' })
        .build()

      expect(node['@id']).to.include('/vocab/tcm/nature/warm')
    })

    it('should generate correct IRI for Ayurveda dosha', () => {
      const node = VocabularyNode.builder(NodeType.AYURVEDA_DOSHA)
        .slug('vata')
        .value('vata')
        .prefLabel({ en: 'Vata' })
        .build()

      expect(node['@id']).to.include('/vocab/ayurveda/dosha/vata')
    })

    it('should build with optional fields', () => {
      const node = VocabularyNode.builder(NodeType.TCM_FLAVOR)
        .slug('sweet')
        .value('sweet')
        .prefLabel({ en: 'Sweet' })
        .altLabel({ en: 'Gan' })
        .description({ en: 'Sweet flavor in TCM' })
        .broader('https://test.org/vocab/parent')
        .build()

      expect(node.altLabel).to.exist
      expect(node.description).to.exist
      expect(node.broader).to.exist
    })
  })
})
