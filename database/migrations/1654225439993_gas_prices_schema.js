'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class GasPricesSchema extends Schema {
  up () {
    this.create('gas_prices', (table) => {
      table.increments()
      table.integer('chainId').unique()
      table.string('SafeGasPrice')
      table.string('ProposeGasPrice')
      table.string('FastGasPrice')
      table.timestamps()
    })
  }

  down () {
    this.drop('gas_prices')
  }
}

module.exports = GasPricesSchema
