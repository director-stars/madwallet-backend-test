'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PolygonTokensSchema extends Schema {
  up () {
    this.create('polygon_tokens', (table) => {
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
    this.drop('polygon_tokens')
  }
}

module.exports = PolygonTokensSchema
