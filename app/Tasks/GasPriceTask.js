'use strict'

const Task = use('Task')
const Env = use('Env');
const GasPrice = use("App/Models/GasPrice");
const { signatureUtils, generatePseudoRandomSalt, orderHashUtils } = require('@0x/order-utils');
const ETHERSCAN_API_KEY = Env.get('ETHERSCAN_API_KEY');
const BSCSCAN_API_KEY = Env.get('BSCSCAN_API_KEY');
const POLYGONSCAN_API_KEY = Env.get('POLYGONSCAN_API_KEY');

class GasPriceTask extends Task {
  static get schedule () {
    return '* * * * * *'
  }

  async handle () {
    const headers = new Headers();

    headers.append('Content-Type', 'application/json');
    headers.append('Accept', 'application/json');

    headers.append('Access-Control-Allow-Origin', '*');
    headers.append('Access-Control-Allow-Credentials', 'true');
    headers.append('Access-Control-Allow-Headers', '*');

    headers.append('GET', 'POST', 'OPTIONS');

    let gasPrice = await GasPrice.query().where('chainId', 1).first();
    let res = await fetch(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`, {
        method: "GET",
        headers
    });

    let responseData = await res.json();
    console.log('ethereum -- ', responseData.status)
    if(responseData.status){
      if(gasPrice){
        gasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        gasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        gasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        gasPrice.save();
      }
      else{
        const newGasPrice = new GasPrice();
        newGasPrice.chainId = 1;
        newGasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        newGasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        newGasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        newGasPrice.save();
      }
    }

    gasPrice = await GasPrice.query().where('chainId', 56).first();
    res = await fetch(`https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=${BSCSCAN_API_KEY}`, {
        method: "GET",
        headers
    });

    responseData = await res.json();
    console.log('bsc -- ', responseData.status)
    if(responseData.status){
      if(gasPrice){
        gasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        gasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        gasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        gasPrice.save();
      }
      else{
        const newGasPrice = new GasPrice();
        newGasPrice.chainId = 56;
        newGasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        newGasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        newGasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        newGasPrice.save();
      }
    }

    gasPrice = await GasPrice.query().where('chainId', 137).first();
    res = await fetch(`https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=${POLYGONSCAN_API_KEY}`, {
        method: "GET",
        headers
    });

    responseData = await res.json();
    console.log('polygon -- ', responseData.status)
    if(responseData.status){
      if(gasPrice){
        gasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        gasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        gasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        gasPrice.save();
      }
      else{
        const newGasPrice = new GasPrice();
        newGasPrice.chainId = 137;
        newGasPrice.SafeGasPrice = Math.ceil(responseData.result.SafeGasPrice);
        newGasPrice.ProposeGasPrice = Math.ceil(responseData.result.ProposeGasPrice);
        newGasPrice.FastGasPrice = Math.ceil(responseData.result.FastGasPrice);
        newGasPrice.save();
      }
    }
  }
}

module.exports = GasPriceTask
