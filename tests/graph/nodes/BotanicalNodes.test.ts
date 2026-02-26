/**
 * Unit Tests for Botanical Node Classes
 *
 * Tests SpeciesNode, PartNode, and ChemicalNode builders and classes.
 */

import { describe, it } from 'vitest'
import { expect } from 'vitest'
import {
  SpeciesNode,
  SpeciesNodeBuilder,
  PartNode,
  PartNodeBuilder,
  ChemicalNode,
  ChemicalNodeBuilder,
} from '../../../src/graph/nodes/BotanicalNodes.js'
import { NodeType } from '../../../src/graph/types.js'

describe('SpeciesNode', () => {
  describe('SpeciesNodeBuilder', () => {
    it('should build a species node with required fields', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng C.A. Meyer')
        .name({ en: 'Ginseng', zh: '人蔘' })
        .build()

      expect(node.slug).to.equal('panax-ginseng')
      expect(node.scientificName).to.equal('Panax ginseng C.A. Meyer')
      expect(node.name).to.deep.equal({ en: 'Ginseng', zh: '人蔘' })
    })

    it('should throw error when slug is missing', () => {
      expect(() => {
        SpeciesNode.builder()
          .scientificName('Panax ginseng')
          .build()
      }).to.throw('slug is required')
    })

    it('should allow empty scientificName for synthetic sources', () => {
      // scientificName is optional for synthetic/non-botanical sources
      const node = SpeciesNode.builder()
        .slug('synthetic-compound')
        .name({ en: 'Synthetic Compound' })
        .build()

      expect(node.slug).to.equal('synthetic-compound')
      expect(node.scientificName).to.equal('')
    })

    it('should build with optional fields', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng')
        .name({ en: 'Ginseng' })
        .description({ en: 'A medicinal plant' })
        .family('Araliaceae')
        .genus('Panax')
        .gbifId('12345')
        .wikidataId('Q192163')
        .build()

      expect(node.description).to.deep.equal({ en: 'A medicinal plant' })
      expect(node.family).to.equal('Araliaceae')
      expect(node.genus).to.equal('Panax')
      expect(node.gbifId).to.equal('12345')
      expect(node.wikidataId).to.equal('Q192163')
    })

    it('should add parts, chemicals, and profiles', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng')
        .name({ en: 'Ginseng' })
        .addPart('https://test.org/part/root')
        .addChemical('https://test.org/chemical/ginsenosides')
        .addProfile('https://test.org/profile/tcm/ren-shen')
        .addImage('https://test.org/image/ginseng.jpg')
        .build()

      expect(node.hasParts).to.have.lengthOf(1)
      expect(node.containsChemicals).to.have.lengthOf(1)
      expect(node.hasProfiles).to.have.lengthOf(1)
      expect(node.images).to.have.lengthOf(1)
    })
  })

  describe('SpeciesNode', () => {
    it('should generate correct IRI', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng')
        .name({ en: 'Ginseng' })
        .build()

      expect(node['@id']).to.include('/species/panax-ginseng')
    })

    it('should have correct types', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng')
        .name({ en: 'Ginseng' })
        .build()

      expect(node['@type']).to.include('schema:Plant')
      expect(node['@type']).to.include('herbapedia:MedicinalPlant')
    })

    it('should serialize to JSON-LD', () => {
      const node = SpeciesNode.builder()
        .slug('panax-ginseng')
        .scientificName('Panax ginseng')
        .name({ en: 'Ginseng' })
        .build()

      const json = node.toJSON()

      expect(json['@context']).to.exist
      expect(json['@id']).to.exist
      expect(json['@type']).to.exist
      expect(json.scientificName).to.equal('Panax ginseng')
    })

    it('should create from JSON-LD', () => {
      const data = {
        '@id': 'https://www.herbapedia.org/graph/species/panax-ginseng',
        scientificName: 'Panax ginseng',
        name: { en: 'Ginseng' },
        family: 'Araliaceae',
      }

      const node = SpeciesNode.fromJSONLD(data)

      expect(node.slug).to.equal('panax-ginseng')
      expect(node.scientificName).to.equal('Panax ginseng')
      expect(node.family).to.equal('Araliaceae')
    })
  })
})

describe('PartNode', () => {
  describe('PartNodeBuilder', () => {
    it('should build a part node with required fields', () => {
      const node = PartNode.builder()
        .slug('ginseng-root')
        .name({ en: 'Ginseng Root' })
        .build()

      expect(node.slug).to.equal('ginseng-root')
      expect(node.name).to.deep.equal({ en: 'Ginseng Root' })
    })

    it('should throw error when slug is missing', () => {
      expect(() => {
        PartNode.builder()
          .name({ en: 'Root' })
          .build()
      }).to.throw('slug is required')
    })

    it('should build with optional fields', () => {
      const node = PartNode.builder()
        .slug('ginseng-root')
        .name({ en: 'Ginseng Root' })
        .partOf('https://test.org/species/panax-ginseng')
        .partType('root')
        .addChemical('https://test.org/chemical/ginsenosides')
        .build()

      expect(node.partOf).to.deep.equal({ '@id': 'https://test.org/species/panax-ginseng' })
      expect(node.partType).to.equal('root')
      expect(node.containsChemicals).to.have.lengthOf(1)
    })
  })

  describe('PartNode', () => {
    it('should generate correct IRI', () => {
      const node = PartNode.builder()
        .slug('ginseng-root')
        .name({ en: 'Ginseng Root' })
        .build()

      expect(node['@id']).to.include('/part/ginseng-root')
    })

    it('should have correct type', () => {
      const node = PartNode.builder()
        .slug('ginseng-root')
        .name({ en: 'Ginseng Root' })
        .build()

      expect(node['@type']).to.include('herbapedia:PlantPart')
    })
  })
})

describe('ChemicalNode', () => {
  describe('ChemicalNodeBuilder', () => {
    it('should build a chemical node with required fields', () => {
      const node = ChemicalNode.builder()
        .slug('ginsenosides')
        .name({ en: 'Ginsenosides' })
        .build()

      expect(node.slug).to.equal('ginsenosides')
      expect(node.name).to.deep.equal({ en: 'Ginsenosides' })
    })

    it('should throw error when slug is missing', () => {
      expect(() => {
        ChemicalNode.builder()
          .name({ en: 'Chemical' })
          .build()
      }).to.throw('slug is required')
    })

    it('should build with optional fields', () => {
      const node = ChemicalNode.builder()
        .slug('ginsenosides')
        .name({ en: 'Ginsenosides' })
        .formula('C42H72O14')
        .casNumber('22327-92-2')
        .inchiKey('RBKQYMVQJHRZBK-UHFFFAOYSA-N')
        .pubchemId('9898276')
        .build()

      expect(node.formula).to.equal('C42H72O14')
      expect(node.casNumber).to.equal('22327-92-2')
      expect(node.inchiKey).to.equal('RBKQYMVQJHRZBK-UHFFFAOYSA-N')
      expect(node.pubchemId).to.equal('9898276')
    })
  })

  describe('ChemicalNode', () => {
    it('should generate correct IRI', () => {
      const node = ChemicalNode.builder()
        .slug('ginsenosides')
        .name({ en: 'Ginsenosides' })
        .build()

      expect(node['@id']).to.include('/chemical/ginsenosides')
    })

    it('should have correct type', () => {
      const node = ChemicalNode.builder()
        .slug('ginsenosides')
        .name({ en: 'Ginsenosides' })
        .build()

      expect(node['@type']).to.include('herbapedia:ChemicalCompound')
    })

    it('should serialize to JSON-LD', () => {
      const node = ChemicalNode.builder()
        .slug('ginsenosides')
        .name({ en: 'Ginsenosides' })
        .formula('C42H72O14')
        .build()

      const json = node.toJSON()

      expect(json.formula).to.equal('C42H72O14')
      expect(json.name).to.deep.equal({ en: 'Ginsenosides' })
    })
  })
})
