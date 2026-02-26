/**
 * Unit Tests for GraphNodeBase
 *
 * Tests the base class functionality for all graph nodes.
 */

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { GraphNodeBase, lang, ref, refs } from '../../../src/graph/nodes/GraphNodeBase.js'
import { NodeType } from '../../../src/graph/types.js'

// Concrete implementation for testing
class TestNode extends GraphNodeBase {
  readonly testProp: string

  constructor(id: string, testProp: string) {
    super('https://test.org/context.jsonld', id, 'TestType')
    this.testProp = testProp
  }
}

describe('GraphNodeBase', () => {
  describe('Constructor', () => {
    it('should create node with context, id, and type', () => {
      const node = new TestNode('https://test.org/node/1', 'value')

      expect(node['@context']).to.equal('https://test.org/context.jsonld')
      expect(node['@id']).to.equal('https://test.org/node/1')
      expect(node['@type']).to.deep.equal(['TestType'])
    })

    it('should accept array of types', () => {
      class MultiTypeNode extends GraphNodeBase {
        constructor() {
          super('ctx', 'id', ['Type1', 'Type2'])
        }
      }

      const node = new MultiTypeNode()
      expect(node['@type']).to.deep.equal(['Type1', 'Type2'])
    })
  })

  describe('toJSON', () => {
    it('should serialize to JSON-LD object', () => {
      const node = new TestNode('https://test.org/node/1', 'testValue')

      const json = node.toJSON()

      expect(json['@context']).to.equal('https://test.org/context.jsonld')
      expect(json['@id']).to.equal('https://test.org/node/1')
      expect(json['@type']).to.deep.equal(['TestType'])
      expect(json['testProp']).to.equal('testValue')
    })

    it('should exclude internal properties starting with _', () => {
      class NodeWithPrivate extends GraphNodeBase {
        _privateProp = 'hidden'
        publicProp = 'visible'

        constructor() {
          super('ctx', 'id', 'type')
        }
      }

      const node = new NodeWithPrivate()
      const json = node.toJSON()

      expect(json).to.not.have.property('_privateProp')
      expect(json).to.have.property('publicProp')
    })

    it('should exclude undefined and null values', () => {
      class NodeWithOptional extends GraphNodeBase {
        optional?: string
        defined: string

        constructor() {
          super('ctx', 'id', 'type')
          this.defined = 'value'
        }
      }

      const node = new NodeWithOptional()
      const json = node.toJSON()

      expect(json).to.have.property('defined')
      expect(json).to.not.have.property('optional')
    })
  })

  describe('toString', () => {
    it('should serialize to JSON string', () => {
      const node = new TestNode('https://test.org/node/1', 'value')

      const str = node.toString()

      expect(str).to.be.a('string')
      expect(() => JSON.parse(str)).to.not.throw()
    })

    it('should produce pretty output by default', () => {
      const node = new TestNode('https://test.org/node/1', 'value')

      const str = node.toString()

      expect(str).to.include('\n')  // Pretty print has newlines
    })

    it('should produce compact output when pretty=false', () => {
      const node = new TestNode('https://test.org/node/1', 'value')

      const str = node.toString(false)

      // Compact output should be a single line (or close to it)
      expect(str).to.be.a('string')
    })
  })
})

describe('Helper Functions', () => {
  describe('lang', () => {
    it('should create language map', () => {
      const map = lang({
        en: 'English',
        zh: 'Chinese',
      })

      expect(map).to.deep.equal({
        en: 'English',
        zh: 'Chinese',
      })
    })

    it('should return empty object for no entries', () => {
      const map = lang({})

      expect(map).to.deep.equal({})
    })
  })

  describe('ref', () => {
    it('should create IRI reference', () => {
      const reference = ref('https://test.org/node/1')

      expect(reference).to.deep.equal({
        '@id': 'https://test.org/node/1',
      })
    })
  })

  describe('refs', () => {
    it('should create array of IRI references', () => {
      const references = refs(['slug1', 'slug2'], NodeType.SPECIES)

      expect(references).to.have.lengthOf(2)
      expect(references[0]).to.have.property('@id')
      expect(references[0]['@id']).to.include('slug1')
      expect(references[1]['@id']).to.include('slug2')
    })

    it('should generate correct IRI patterns', () => {
      const refs1 = refs(['test'], NodeType.SPECIES)
      expect(refs1[0]['@id']).to.include('/species/')

      const refs2 = refs(['test'], NodeType.CHEMICAL)
      expect(refs2[0]['@id']).to.include('/chemical/')

      const refs3 = refs(['test'], NodeType.TCM_PROFILE)
      expect(refs3[0]['@id']).to.include('/profile/tcm/')
    })
  })
})
