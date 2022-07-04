'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TradeSchema extends Schema {
  up () {
    this.create('trades', (table) => {
      table.increments()
      table.string('aggregator')
      table.string('aggType')
      table.integer('chainId')
      table.integer('quoteRefreshSeconds')
      table.string('gasMultiplier')
      table.integer('maxGas')
      table.integer('averageGas')
      table.integer('estimatedRefund')
      table.timestamps()
    })
  }

  down () {
    this.drop('trades')
  }
}

module.exports = TradeSchema
