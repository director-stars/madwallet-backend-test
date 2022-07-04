'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EthereumTokensSchema extends Schema {
  up () {
    this.create('ethereum_tokens', (table) => {
      table.increments()
      table.string('name')
      table.string('symbol')
      table.integer("decimals")
      table.string('address').unique()
      table.text('iconUrl')
      table.integer('occurrences')
      table.text('aggregators')
      table.boolean('topAsset').defaultTo(false)
      table.timestamps()
    })
  }

  down () {
    this.drop('ethereum_tokens')
  }
}

module.exports = EthereumTokensSchema
