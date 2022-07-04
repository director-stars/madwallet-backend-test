'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AggregatorMetadataSchema extends Schema {
  up () {
    this.create('aggregator_metadata', (table) => {
      table.increments()
      table.string('aggregator').unique()
      table.string('color')
      table.string('title')
      table.text('icon')
      table.text('iconPng')
      table.timestamps()
    })
  }

  down () {
    this.drop('aggregator_metadata')
  }
}

module.exports = AggregatorMetadataSchema
