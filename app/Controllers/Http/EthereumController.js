'use strict'

const Web3 = require('web3');
const Env = use('Env');
const { signatureUtils, generatePseudoRandomSalt, orderHashUtils } = require('@0x/order-utils');
const tokenABI = require('../../../config/abis/token.json')
const { ethers } = require('ethers')
const { Registry } = require('@airswap/libraries')
const BigNumber = require('big-number');
const { ParaSwap } = require('paraswap');
let swapRouterContractAddress = '0x2B1eAD015dbab6618760ACee5e72148b95B95980';
const airswapWrapper = '0x3a0e257568cc9c6c5d767d5dc0cd8a9ac69cc3ae';
const zeroAddress = "0x0000000000000000000000000000000000000000";
const xendTokenAddress = "0xE4CFE9eAa8Cdb0942A80B7bC68fD8Ab0F6D44903";
const nativeToken = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const MORALIS_KEY = Env.get('MORALIS_KEY');
const MORALIS_X_API_KEY = Env.get('MORALIS_X_API_KEY');
const defaultFee = 50;
const chainId = 1;
const PROVIDER_URL = "https://speedy-nodes-nyc.moralis.io/"+MORALIS_KEY+"/eth/mainnet";
const EthereumToken = use("App/Models/EthereumToken");
const GasPrice = use("App/Models/GasPrice");
const AggregatorMetaData = use("App/Models/AggregatorMetadatum");
const AggregatorChainId = use("App/Models/AggregatorChainId");
const Trade = use("App/Models/Trade");

class EthereumController {

    async trades ({ request, response }) {
        const queryData = {
            destinationToken : request.input('destinationToken').toLowerCase(),
            sourceToken : request.input('sourceToken').toLowerCase(),
            sourceAmount : request.input('sourceAmount'),
            slippage : request.input('slippage'),
            timeout : request.input('timeout'),
            walletAddress : request.input('walletAddress').toLowerCase()
        }
        
        if(request.input('swapRouterContractAddress')){
            queryData.swapRouterContractAddress = request.input('swapRouterContractAddress').toLowerCase()
        }
        else
            queryData.swapRouterContractAddress = swapRouterContractAddress.toLowerCase();
        
        const provider = new Web3.providers.HttpProvider(PROVIDER_URL);
        const web3 = new Web3(provider)
        

        const headers = new Headers();

        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');

        headers.append('Access-Control-Allow-Origin', '*');
        headers.append('Access-Control-Allow-Credentials', 'true');
        headers.append('Access-Control-Allow-Headers', '*');

        headers.append('GET', 'POST', 'OPTIONS');
        headers.append('X-API-Key', MORALIS_X_API_KEY);
        /////////////////////////////////
        let priceResponse = await fetch(`https://deep-index.moralis.io/api/v2/erc20/${nativeToken}/price?chain=0x1`, {
            method: "GET",
            headers
        });

        const nativeTokenPrice = await priceResponse.json()

        let sourceTokenDecimal = 18;
        let destinationTokenDecimal = 18;

        let sourceTokenPrice;

        if(queryData.sourceToken != zeroAddress){
            priceResponse = await fetch(`https://deep-index.moralis.io/api/v2/erc20/${queryData.sourceToken}/price?chain=0x1`, {
                method: "GET",
                headers
            });
            sourceTokenPrice = await priceResponse.json();
            const sourceTokenContract = new web3.eth.Contract(tokenABI, queryData.sourceToken);
            sourceTokenDecimal = await sourceTokenContract.methods.decimals();
        }
        else{
            sourceTokenPrice = nativeTokenPrice;
        }

        let destinationTokenPrice;

        if(queryData.destinationToken != zeroAddress){
            priceResponse = await fetch(`https://deep-index.moralis.io/api/v2/erc20/${queryData.destinationToken}/price?chain=0x1`, {
                method: "GET",
                headers
            });
            destinationTokenPrice = await priceResponse.json();
            const destinationTokenContract = new web3.eth.Contract(tokenABI, queryData.destinationToken);
            destinationTokenDecimal = await destinationTokenContract.methods.decimals().call();
        }
        else{
            destinationTokenPrice = nativeTokenPrice;
        }

        const sourceTokenRate = sourceTokenPrice.nativePrice.value / nativeTokenPrice.nativePrice.value;

        const destinationTokenRate = destinationTokenPrice.nativePrice.value / nativeTokenPrice.nativePrice.value;

        const xendTokenContract = new web3.eth.Contract(tokenABI, xendTokenAddress);
        const xendTokenAmount = await xendTokenContract.methods.balanceOf(queryData.walletAddress);
        let fee = defaultFee;
        if(xendTokenAmount >= 10 ** 18 * 10 ** 4){
            fee = 0;
        }

        let new_response = [];

        let allowance;
        if(queryData.sourceToken != zeroAddress){
            const sourceTokenContract = new web3.eth.Contract(tokenABI, queryData.sourceToken);
            allowance = await sourceTokenContract.methods.allowance(queryData.walletAddress, queryData.swapRouterContractAddress).call();
        }

        let approvalNeeded;

        if(allowance == 0){
            if(queryData.sourceToken != zeroAddress){
                approvalNeeded = {};
                const approveData = web3.eth.abi.encodeFunctionCall({
                    name: 'approve',
                    type: 'function',
                    inputs: [{
                        type: 'address',
                        name: 'spender'
                    },{
                        type: 'uint256',
                        name: 'amount'
                    }]
                }, [queryData.swapRouterContractAddress, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff']);
                approvalNeeded.data = approveData;
                approvalNeeded.to = queryData.sourceToken;
                approvalNeeded.value = "0";
                approvalNeeded.from = queryData.walletAddress;
            }
        }
        else{
            approvalNeeded = null;
        }

        let dbTradeData;
        let aggregator;

        //////////////////airswapV3/////////////////
        const airswapV3Data = {};
        let tmpTradeData = await this.airswapV3TradeData(web3, queryData, fee, provider);
        if(tmpTradeData.tradeData){
            airswapV3Data.trade = {
                data : tmpTradeData.tradeData,
                from : queryData.walletAddress,
                value : (queryData.sourceToken == zeroAddress) ? queryData.sourceAmount : '0',
                to : queryData.swapRouterContractAddress,
            }
            airswapV3Data.destinationAmount = tmpTradeData.tradeDestinationAmount;
            airswapV3Data.error = null;
        }
        else{
            airswapV3Data.trade = null;
            airswapV3Data.error = tmpTradeData.tradeError;
            airswapV3Data.destinationAmount = null;
        }
        airswapV3Data.sourceAmount = queryData.sourceAmount;
        airswapV3Data.sourceToken = queryData.sourceToken;
        airswapV3Data.destinationToken = queryData.destinationToken;
        airswapV3Data.fee = fee / 100;
        airswapV3Data.sourceTokenRate = sourceTokenRate;
        airswapV3Data.destinationTokenRate = destinationTokenRate;
        aggregator  ="airswapV3";
        airswapV3Data.aggregator = aggregator;
        dbTradeData = await Trade.query().where('chainId', chainId).andWhere('aggregator', aggregator).first();
        airswapV3Data.aggType = dbTradeData.aggType;
        airswapV3Data.quoteRefreshSeconds = dbTradeData.quoteRefreshSeconds;
        airswapV3Data.gasMultiplier = dbTradeData.gasMultiplier;

        airswapV3Data.maxGas = dbTradeData.maxGas             /////////////////////////////
        airswapV3Data.averageGas = dbTradeData.averageGas         /////////////////////////////
        if(tmpTradeData.tradeData){
            airswapV3Data.estimatedRefund = dbTradeData.estimatedRefund    /////////////////////////////
        }
        else{
            airswapV3Data.estimatedRefund = 0    /////////////////////////////
        }
        // airswapV3Data.fetchTime = 0;         /////////////////////////////

        if(airswapV3Data.destinationAmount){
            const sourceAmountInETH = sourceTokenRate * queryData.sourceAmount / (10 ** sourceTokenDecimal);
            const destinationAmountInETH = destinationTokenRate * airswapV3Data.destinationAmount / (10 ** destinationTokenDecimal);
            airswapV3Data.priceSlippage = {
                bucket : 'low',
                calculationError : "",
                sourceAmountInETH : sourceAmountInETH,
                destinationAmountInETH : destinationAmountInETH,
                sourceAmountInNativeCurrency : sourceAmountInETH,
                destinationAmountInNativeCurrency : destinationAmountInETH,
                ratio : sourceAmountInETH / destinationAmountInETH,
            }
        }
        else{
            airswapV3Data.priceSlippage = {
                bucket : 'high',
                ratio : null,
                calculationError : "No trade data to calculate price slippage",
                sourceAmountInETH : null,
                destinationAmountInETH : null,
                sourceAmountInNativeCurrency : null,
                destinationAmountInNativeCurrency : null,
            };
        }

        //////////////////oneInch/////////////////
        console.log('oneInch')
        const oneInchData = {};
        tmpTradeData = await this.oneInchTradeData(web3, queryData, fee, provider);
        if(tmpTradeData.tradeData){
            oneInchData.trade = {
                data : tmpTradeData.tradeData,
                from : queryData.walletAddress,
                value : (queryData.sourceToken == zeroAddress) ? queryData.sourceAmount : '0',
                to : queryData.swapRouterContractAddress,
            }
            oneInchData.destinationAmount = tmpTradeData.tradeDestinationAmount;
            oneInchData.error = null;
        }
        else{
            oneInchData.trade = null;
            oneInchData.error = tmpTradeData.tradeError;
            oneInchData.destinationAmount = null;
        }
        oneInchData.sourceAmount = queryData.sourceAmount;
        oneInchData.sourceToken = queryData.sourceToken;
        oneInchData.destinationToken = queryData.destinationToken;
        oneInchData.fee = fee / 100;
        oneInchData.sourceTokenRate = sourceTokenRate;
        oneInchData.destinationTokenRate = destinationTokenRate;
        aggregator  ="oneInch";
        oneInchData.aggregator = aggregator;
        dbTradeData = await Trade.query().where('chainId', chainId).andWhere('aggregator', aggregator).first();
        oneInchData.aggType = dbTradeData.aggType;
        oneInchData.quoteRefreshSeconds = dbTradeData.quoteRefreshSeconds;
        oneInchData.gasMultiplier = dbTradeData.gasMultiplier;

        oneInchData.maxGas = dbTradeData.maxGas             /////////////////////////////
        oneInchData.averageGas = dbTradeData.averageGas         /////////////////////////////
        if(tmpTradeData.tradeData){
            oneInchData.estimatedRefund = dbTradeData.estimatedRefund    /////////////////////////////
        }
        else{
            oneInchData.estimatedRefund = 0    /////////////////////////////
        }
        // oneInchData.fetchTime = 0;         /////////////////////////////

        if(oneInchData.destinationAmount){
            const sourceAmountInETH = sourceTokenRate * queryData.sourceAmount / (10 ** sourceTokenDecimal);
            const destinationAmountInETH = destinationTokenRate * oneInchData.destinationAmount / (10 ** destinationTokenDecimal);
            oneInchData.priceSlippage = {
                bucket : 'low',
                calculationError : "",
                sourceAmountInETH : sourceAmountInETH,
                destinationAmountInETH : destinationAmountInETH,
                sourceAmountInNativeCurrency : sourceAmountInETH,
                destinationAmountInNativeCurrency : destinationAmountInETH,
                ratio : sourceAmountInETH / destinationAmountInETH,
            }
        }
        else{
            oneInchData.priceSlippage = {
                bucket : 'high',
                ratio : null,
                calculationError : "No trade data to calculate price slippage",
                sourceAmountInETH : null,
                destinationAmountInETH : null,
                sourceAmountInNativeCurrency : null,
                destinationAmountInNativeCurrency : null,
            };
        }


        //////////////////paraswap/////////////////
        const paraswapData = {};
        tmpTradeData = await this.paraswapTradeData(web3, queryData, fee, provider);
        if(tmpTradeData.tradeData){
            paraswapData.trade = {
                data : tmpTradeData.tradeData,
                from : queryData.walletAddress,
                value : (queryData.sourceToken == zeroAddress) ? queryData.sourceAmount : '0',
                to : queryData.swapRouterContractAddress,
            }
            paraswapData.destinationAmount = tmpTradeData.tradeDestinationAmount;
            paraswapData.error = null;
        }
        else{
            paraswapData.trade = null;
            paraswapData.error = tmpTradeData.tradeError;
            paraswapData.destinationAmount = null;
        }
        paraswapData.sourceAmount = queryData.sourceAmount;
        paraswapData.sourceToken = queryData.sourceToken;
        paraswapData.destinationToken = queryData.destinationToken;
        paraswapData.fee = fee / 100;
        paraswapData.sourceTokenRate = sourceTokenRate;
        paraswapData.destinationTokenRate = destinationTokenRate;
        aggregator  ="paraswap";
        paraswapData.aggregator = aggregator;
        dbTradeData = await Trade.query().where('chainId', chainId).andWhere('aggregator', aggregator).first();
        paraswapData.aggType = dbTradeData.aggType;
        paraswapData.quoteRefreshSeconds = dbTradeData.quoteRefreshSeconds;
        paraswapData.gasMultiplier = dbTradeData.gasMultiplier;

        paraswapData.maxGas = dbTradeData.maxGas             /////////////////////////////
        paraswapData.averageGas = dbTradeData.averageGas         /////////////////////////////
        if(tmpTradeData.tradeData){
            paraswapData.estimatedRefund = dbTradeData.estimatedRefund    /////////////////////////////
        }
        else{
            paraswapData.estimatedRefund = 0    /////////////////////////////
        }
        // paraswapData.fetchTime = 0;         /////////////////////////////

        if(paraswapData.destinationAmount){
            const sourceAmountInETH = sourceTokenRate * queryData.sourceAmount / (10 ** sourceTokenDecimal);
            const destinationAmountInETH = destinationTokenRate * paraswapData.destinationAmount / (10 ** destinationTokenDecimal);
            paraswapData.priceSlippage = {
                bucket : 'low',
                calculationError : "",
                sourceAmountInETH : sourceAmountInETH,
                destinationAmountInETH : destinationAmountInETH,
                sourceAmountInNativeCurrency : sourceAmountInETH,
                destinationAmountInNativeCurrency : destinationAmountInETH,
                ratio : sourceAmountInETH / destinationAmountInETH,
            }
        }
        else{
            paraswapData.priceSlippage = {
                bucket : 'high',
                ratio : null,
                calculationError : "No trade data to calculate price slippage",
                sourceAmountInETH : null,
                destinationAmountInETH : null,
                sourceAmountInNativeCurrency : null,
                destinationAmountInNativeCurrency : null,
            };
        }

        //////////////////zeroEx/////////////////
        const zeroExData = {};
        tmpTradeData = await this.zeroExTradeData(web3, queryData, fee, provider);
        if(tmpTradeData.tradeData){
            zeroExData.trade = {
                data : tmpTradeData.tradeData,
                from : queryData.walletAddress,
                value : (queryData.sourceToken == zeroAddress) ? queryData.sourceAmount : '0',
                to : queryData.swapRouterContractAddress,
            }
            zeroExData.destinationAmount = tmpTradeData.tradeDestinationAmount;
            zeroExData.error = null;
        }
        else{
            zeroExData.trade = null;
            zeroExData.error = tmpTradeData.tradeError;
            zeroExData.destinationAmount = null;
        }
        zeroExData.sourceAmount = queryData.sourceAmount;
        zeroExData.sourceToken = queryData.sourceToken;
        zeroExData.destinationToken = queryData.destinationToken;
        zeroExData.fee = fee / 100;
        zeroExData.sourceTokenRate = sourceTokenRate;
        zeroExData.destinationTokenRate = destinationTokenRate;
        aggregator  ="zeroEx";
        zeroExData.aggregator = aggregator;
        dbTradeData = await Trade.query().where('chainId', chainId).andWhere('aggregator', aggregator).first();
        zeroExData.aggType = dbTradeData.aggType;
        zeroExData.quoteRefreshSeconds = dbTradeData.quoteRefreshSeconds;
        zeroExData.gasMultiplier = dbTradeData.gasMultiplier;

        zeroExData.maxGas = dbTradeData.maxGas                          /////////////////////////////
        zeroExData.averageGas = dbTradeData.averageGas                  /////////////////////////////
        if(tmpTradeData.tradeData){
            zeroExData.estimatedRefund = dbTradeData.estimatedRefund    /////////////////////////////
        }
        else{
            zeroExData.estimatedRefund = 0                              /////////////////////////////
        }
        // zeroExData.fetchTime = 0;         /////////////////////////////

        if(zeroExData.destinationAmount){
            const sourceAmountInETH = sourceTokenRate * queryData.sourceAmount / (10 ** sourceTokenDecimal);
            const destinationAmountInETH = destinationTokenRate * zeroExData.destinationAmount / (10 ** destinationTokenDecimal);
            zeroExData.priceSlippage = {
                bucket : 'low',
                calculationError : "",
                sourceAmountInETH : sourceAmountInETH,
                destinationAmountInETH : destinationAmountInETH,
                sourceAmountInNativeCurrency : sourceAmountInETH,
                destinationAmountInNativeCurrency : destinationAmountInETH,
                ratio : sourceAmountInETH / destinationAmountInETH,
            }
        }
        else{
            zeroExData.priceSlippage = {
                bucket : 'high',
                ratio : null,
                calculationError : "No trade data to calculate price slippage",
                sourceAmountInETH : null,
                destinationAmountInETH : null,
                sourceAmountInNativeCurrency : null,
                destinationAmountInNativeCurrency : null,
            };
        }

        new_response.push(airswapV3Data);
        new_response.push(oneInchData);
        new_response.push(paraswapData);
        new_response.push(zeroExData);

        return new_response;
    }

    async airswapV3TradeData(web3, queryData, fee, provider) {  
        console.log('airswapV3TradeData')
        //all address should be lowercase.
        const tradeResult = {
            tradeData: null,
            tradeDestinationAmount: 0,
            tradeError: null
        };
        const baseToken = (queryData.sourceToken == zeroAddress) ? nativeToken : queryData.sourceToken;
        const quoteToken = (queryData.destinationToken == zeroAddress) ? nativeToken : queryData.destinationToken;

        const baseTokenAmount = queryData.sourceAmount; 
        const tokenAmount = BigNumber(baseTokenAmount).mult(10000 - fee).div(10000);
        const feeAmount = BigNumber(baseTokenAmount).mult(fee).div(10000);

        const provider1 = new ethers.providers.Web3Provider(provider);

        const servers = await new Registry(chainId, provider1).getServers(
            quoteToken,
            baseToken,
        )

        if(servers.length == 0){
            tradeResult.tradeError = "No valid responses from the AirSwap network";
            return tradeResult;
        }

        let signerAmount = 0;
        let order;
        for(let i = 0; i < servers.length; i ++){
            try{
                const tmp = await servers[i].getSignerSideOrder(
                    tokenAmount.toString(),
                    quoteToken,
                    baseToken,
                    airswapWrapper
                )
                if(tmp.signerAmount > signerAmount){
                    signerAmount = tmp.signerAmount;
                    order = tmp;
                    tradeResult.tradeError = null;
                }
            }
            catch(e) {
                if(signerAmount == 0){
                    tradeResult.tradeError = e;
                }
                console.log('airswap error : ', e)
                continue;
            }
        }

        if(signerAmount == 0)
        return tradeResult;
    
            const txData = web3.eth.abi.encodeFunctionCall({
                name: 'swap',
                type: 'function',
                inputs: [{
                    type: 'uint256',
                    name: 'nonce'
                },
                {
                    type: 'uint256',
                    name: 'expiry'
                },
                {
                    type: 'address',
                    name: 'signerWallet'
                },
                {
                    type: 'address',
                    name: 'signerToken'
                },
                {
                    type: 'uint256',
                    name: 'signerAmount'
                },
                {
                    type: 'address',
                    name: 'senderToken'
                },
                {
                    type: 'uint256',
                    name: 'senderAmount'
                },
                {
                    type: 'uint8',
                    name: 'v'
                },
                {
                    type: 'bytes32',
                    name: 'r'
                },
                {
                    type: 'bytes32',
                    name: 's'
                }]
            }, [order.nonce, order.expiry, order.signerWallet, order.signerToken, order.signerAmount, order.senderToken, order.senderAmount, order.v, order.r, order.s]);

        const newSwapData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
            [queryData.sourceToken, queryData.destinationToken, tokenAmount, order.signerAmount, feeAmount, txData]
        )

        const tmpTradeData = web3.eth.abi.encodeFunctionCall({
            name: 'swap',
            type: 'function',
            inputs: [{
                type: 'string',
                name: 'aggregatorId'
            },{
                type: 'address',
                name: 'tokenFrom'
            },{
                type: 'uint256',
                name: 'amount'
            },{
                type: 'bytes',
                name: 'data'
            }]
        }, ['airswapV3FeeDynamic', queryData.sourceToken, queryData.sourceAmount, newSwapData]);

        tradeResult.tradeData = tmpTradeData;

        return tradeResult;
    }

    async oneInchTradeData(web3, queryData, fee) {
        console.log('oneInchTradeData');
        const tradeResult = {
            tradeData: null,
            tradeDestinationAmount: 0,
            tradeError: null
        };
        const sourceTokenAddress = (queryData.sourceToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.sourceToken;
        const destinationTokenAddress = (queryData.destinationToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.destinationToken;
        const baseTokenAmount = queryData.sourceAmount;
        const tokenAmount = BigNumber(baseTokenAmount).mult(10000 - fee).div(10000);
        const feeAmount = BigNumber(baseTokenAmount).mult(fee).div(10000);
        const url = 'https://api.1inch.io/v4.0/'+chainId+'/swap?fromTokenAddress='+sourceTokenAddress+'&toTokenAddress='+destinationTokenAddress+'&amount='+tokenAmount+'&fromAddress='+queryData.swapRouterContractAddress+'&destReceiver='+queryData.walletAddress+'&slippage='+queryData.slippage+'&disableEstimate=true';
        let swapData;
        try {
            const res = await this.fetchWithTimeout(url, {
              timeout: 10000
            });
            swapData = await res.json();
          } catch (error) {
            tradeResult.tradeError = error;
            console.log('oneInch e: ', error)
            return tradeResult;
        }
        if(swapData.error){
            tradeResult.tradeError = swapData.error;
            console.log('oneInch error: ', swapData.error)
            return tradeResult;
        }

        const newSwapData = web3.eth.abi.encodeParameters(
            ['address','address','uint256','uint256','uint256','bytes'],
            [queryData.sourceToken, queryData.destinationToken, tokenAmount, swapData.toTokenAmount, feeAmount, swapData.tx.data]
        )
        const tmpTradeData = web3.eth.abi.encodeFunctionCall({
            name: 'swap',
            type: 'function',
            inputs: [{
                type: 'string',
                name: 'aggregatorId'
            },{
                type: 'address',
                name: 'tokenFrom'
            },{
                type: 'uint256',
                name: 'amount'
            },{
                type: 'bytes',
                name: 'data'
            }]
        }, ['oneInchV4FeeDynamic', queryData.sourceToken, queryData.sourceAmount, newSwapData]);

        tradeResult.tradeData = tmpTradeData;
        tradeResult.tradeDestinationAmount = swapData.toTokenAmount;
        tradeResult.tradeError = null;
            
        return tradeResult;
    }

    async paraswapTradeData(web3, queryData, fee) {
        console.log('paraswapTradeData');
        const tradeResult = {
            tradeData: null,
            tradeDestinationAmount: 0,
            tradeError: null
        };
        const paraSwap = new ParaSwap(chainId);
        const sourceTokenAddress = (queryData.sourceToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.sourceToken;
        const destinationTokenAddress = (queryData.destinationToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.destinationToken;
        const baseTokenAmount = queryData.sourceAmount;
        const tokenAmount = BigNumber(baseTokenAmount).mult(10000 - fee).div(10000);
        const feeAmount = BigNumber(baseTokenAmount).mult(fee).div(10000);
        const priceRoute = await paraSwap.getRate(
            sourceTokenAddress,
            destinationTokenAddress,
            tokenAmount
        );

        const bodyData = {
            srcToken: sourceTokenAddress,
            destToken: destinationTokenAddress,
            srcAmount: tokenAmount.toString(),
            slippage: queryData.slippage * 100,
            priceRoute: priceRoute,
            userAddress: queryData.swapRouterContractAddress,
            partner: 'xendfinance',
        }

        if(priceRoute.error){
            tradeResult.tradeError = priceRoute.error;
            console.log('priceRoute-error : ', priceRoute.error);
            return tradeResult;
        }

        let url = 'https://apiv5.paraswap.io/transactions/'+chainId+'?ignoreChecks=true';

        const config = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyData),
            timeout: 10000
        }

        let res;
        try {
            res = await this.fetchWithTimeout(url, config);
        } catch (error) {
            tradeResult.tradeError = error;
            console.log('paraswap e: ', error)
            return tradeResult;
        }
        const txParams = await res.json();
        if(txParams.error){
            tradeResult.tradeError = txParams.error;
            console.log('newSwapData-error : ', txParams.error);
            return tradeResult;
        }
            
        const newSwapData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
            [queryData.sourceToken, queryData.destinationToken, tokenAmount, priceRoute.destAmount, feeAmount, txParams.data]
        )

        const tmpTradeData = web3.eth.abi.encodeFunctionCall({
            name: 'swap',
            type: 'function',
            inputs: [{
                type: 'string',
                name: 'aggregatorId'
            },{
                type: 'address',
                name: 'tokenFrom'
            },{
                type: 'uint256',
                name: 'amount'
            },{
                type: 'bytes',
                name: 'data'
            }]
        }, ['paraswapV5FeeDynamic', queryData.sourceToken, queryData.sourceAmount, newSwapData]);

        tradeResult.tradeData = tmpTradeData;
        tradeResult.tradeDestinationAmount = priceRoute.destAmount;
        tradeResult.tradeError = null;

        return tradeResult;
    }

    async zeroExTradeData(web3, queryData, fee) {
        console.log('zeroExTradeData');
        const tradeResult = {
            tradeData: null,
            tradeDestinationAmount: 0,
            tradeError: null
        };
        const sourceTokenAddress = (queryData.sourceToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.sourceToken;
        const destinationTokenAddress = (queryData.destinationToken == zeroAddress) ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : queryData.destinationToken;
        const baseTokenAmount = queryData.sourceAmount;
        const tokenAmount = BigNumber(baseTokenAmount).mult(10000 - fee).div(10000);
        const feeAmount = BigNumber(baseTokenAmount).mult(fee).div(10000);
        const url = 'https://api.0x.org/swap/v1/quote?sellToken='+sourceTokenAddress+'&buyToken='+destinationTokenAddress+'&sellAmount='+tokenAmount+'&takerAddress='+queryData.walletAddress+'&slippagePercentage='+(queryData.slippage / 100)+'&skipValidation=true';
        let swapData;
        try {
            const res = await this.fetchWithTimeout(url, {
              timeout: 10000
            });
            swapData = await res.json();
          } catch (error) {
            tradeResult.tradeError = error;
            console.log('zeroEx e: ', error)
            return tradeResult;
        }
        const newSwapData = web3.eth.abi.encodeParameters(
            ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes'],
            [queryData.sourceToken, queryData.destinationToken, tokenAmount, swapData.buyAmount, feeAmount, swapData.data]
        )

        const tmpTradeData = web3.eth.abi.encodeFunctionCall({
            name: 'swap',
            type: 'function',
            inputs: [{
                type: 'string',
                name: 'aggregatorId'
            },{
                type: 'address',
                name: 'tokenFrom'
            },{
                type: 'uint256',
                name: 'amount'
            },{
                type: 'bytes',
                name: 'data'
            }]
        }, ['0xFeeDynamic', queryData.sourceToken, queryData.sourceAmount, newSwapData]);

        tradeResult.tradeData = tmpTradeData;
        tradeResult.tradeDestinationAmount = swapData.buyAmount;
        tradeResult.tradeError = null;

        return tradeResult;
    }

    async tokens ({ request, response }) {

        const queryResult = await EthereumToken.query().setHidden(['id', 'updated_at', 'created_at']).orderBy('occurrences', 'desc').fetch();
        let tokens = queryResult.toJSON();

        for(let i = 0; i < tokens.length; i ++){
            tokens[i].aggregators = JSON.parse(tokens[i].aggregators);
        }
        return tokens;
    }

    async token ({ request, response }) {

        const address = request.input('address')
        const token = await EthereumToken.query().setVisible(['name', 'symbol', 'decimals', 'address', 'iconUrl', 'occurrences', 'aggregators']).where('address', address).first();
        token.aggregators = JSON.parse(token.aggregators)
        return token;
    }

    async aggregatorMetadata ({ request, response }) {
        let queryResult = await AggregatorChainId.query().where('chainId', chainId).fetch();
        let data = queryResult.toJSON();
        let aggregators = [];
        for(let i = 0; i < data.length; i ++){
            aggregators.push(data[i].aggregator);
        }
        queryResult = await AggregatorMetaData.query().setVisible(['aggregator', 'color', 'title', 'icon', 'iconPng']).whereIn('aggregator', aggregators).fetch();
        data = queryResult.toJSON();
        let metadata = {};
        for(let i = 0; i < data.length; i ++){
            const props = {}
            props.color = data[i].color
            props.title = data[i].title
            props.icon = data[i].icon
            props.iconPng = data[i].iconPng
            metadata[data[i].aggregator] = props
        }
        return metadata;
    }

    async topAssets ({ request, response }) {
        const tokens = await EthereumToken.query().setVisible(['address', 'symbol']).where('topAsset', true).fetch();
        return tokens;
    }

    async gasPrices ({ request, response }) {
        
        const gasPrice = await GasPrice.query().where('chainId', chainId).first();
        let result = {};
        result.SafeGasPrice = gasPrice.SafeGasPrice;
        result.ProposeGasPrice = gasPrice.ProposeGasPrice;
        result.FastGasPrice = gasPrice.FastGasPrice;

        return result;
    }

    async fetchWithTimeout(resource, options = {}) {
        const { timeout = 8000 } = options;
        console.log('timeout : ', timeout)
        
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, {
          ...options,
          signal: controller.signal  
        });
        clearTimeout(id);
        return response;
    }
}
module.exports = EthereumController
