'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AggregatorChainIdSchema extends Schema {
  up () {
    this.create('aggregator_chain_ids', (table) => {
      table.increments()
      table.integer('chainId')
      table.string('aggregator')
      table.timestamps()
    })
  }

  down () {
    this.drop('aggregator_chain_ids')
  }
}

module.exports = AggregatorChainIdSchema
