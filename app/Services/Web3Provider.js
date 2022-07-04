const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
const Env = use('Env');

class Web3Provider {
  constructor() {
    this.privateKey = Env.get('PRIVATE_KEY');
    this.provider = new HDWalletProvider(this.privateKey, `https://bsc-dataseed.binance.org/`);
    this.web3 = new Web3(this.provider);
  }

  getWeb3Provider() {
    return this.web3;
  }

  getAccountAddress() {
    return this.provider.addresses[0];
  }

  async execute(tx) {
    try {
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, this.privateKey);
      try {
        const receipt = await this.web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
        console.log('success');
      } catch (error) {
        console.log('sending Tx:', error);
      }
    } catch (error) {
      console.log('signing Tx:', error);
    }
    // const signPromise = this.web3.eth.accounts.signTransaction(tx, this.privateKey);
    // signPromise.then((signedTx) => {
    //   const sentTx = this.web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
    //   sentTx.on("receipt", receipt => {
    //     console.log('success');
    //   });
    //   sentTx.on("error", err => {
    //     console.log(err);
    //   });
    // }).catch((err) => {
    //   console.log('promise failed');
    // });
  }
}

module.exports = Web3Provider;
