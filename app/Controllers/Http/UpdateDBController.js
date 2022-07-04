'use strict'

const Web3 = require('web3');
const Env = use('Env');
const { signatureUtils, generatePseudoRandomSalt, orderHashUtils } = require('@0x/order-utils');
const Metamask_API_URL = 'https://swap.metaswap.codefi.network/networks';
const MORALIS_KEY = Env.get('MORALIS_KEY');
const PROVIDER_URL = "https://speedy-nodes-nyc.moralis.io/"+MORALIS_KEY+"/eth/mainnet";
const EthereumToken = use("App/Models/EthereumToken");
const BscToken = use("App/Models/BscToken");
const PolygonToken = use("App/Models/PolygonToken");
const AggregatorMetadata = use("App/Models/AggregatorMetadatum");
const AggregatorChainId = use("App/Models/AggregatorChainId");

class UpdateDBController {
    async tokens ({ request, response }) {
        console.log('tokens')
        const headers = new Headers();

        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');

        headers.append('Access-Control-Allow-Origin', '*');
        headers.append('Access-Control-Allow-Credentials', 'true');
        headers.append('Access-Control-Allow-Headers', '*');

        headers.append('GET', 'POST', 'OPTIONS');
        /////////////////////////////////
        const res = await fetch(`${Metamask_API_URL}/137/tokens`, {
            method: "GET",
            headers
        });

        const responseData = await res.json();
        console.log(responseData.length);
        let newToken;
        let maxLength = 0;
        let oldToken
        for(let i = 0; i< responseData.length; i ++){
            // oldToken = await EthereumToken.query().where('address', responseData[i].address).first();
            // newToken = new EthereumToken();
            // oldToken = await BscToken.query().where('address', responseData[i].address).first();
            // newToken = new BscToken();
            oldToken = await PolygonToken.query().where('address', responseData[i].address).first();
            newToken = new PolygonToken()
            if(oldToken)
                continue;
            newToken.address = responseData[i].address
            newToken.name = responseData[i].name
            newToken.symbol = responseData[i].symbol
            newToken.decimals = responseData[i].decimals
            if(responseData[i].iconUrl)
                newToken.iconUrl = responseData[i].iconUrl
            newToken.occurrences = responseData[i].occurrences
            newToken.aggregators = JSON.stringify(responseData[i].aggregators)
            newToken.save();
        }
        console.log('maxLength : ', maxLength)
        return responseData;
    }

    async aggregatorMetadata ({ request, response }) {
        const headers = new Headers();

        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');

        headers.append('Access-Control-Allow-Origin', '*');
        headers.append('Access-Control-Allow-Credentials', 'true');
        headers.append('Access-Control-Allow-Headers', '*');

        headers.append('GET', 'POST', 'OPTIONS');
        const chainId = 137;
        /////////////////////////////////
        const res = await fetch(`${Metamask_API_URL}/${chainId}/aggregatorMetadata`, {
            method: "GET",
            headers
        });

        const responseData = await res.json();
        
        let newAggregatorMetadata;
        let aggregatorChainId;
        let aggregator;

        console.log('aggregatorMetadata')
        if(responseData.airswapLight){
            aggregator = "airswapLight";
            // newAggregatorMetadata = await AggregatorMetadata.query().first();
            // console.log(newAggregatorMetadata)
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            console.log('airswapLight')
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.airswapLight.color
                newAggregatorMetadata.title = responseData.airswapLight.title
                newAggregatorMetadata.icon = responseData.airswapLight.icon
                newAggregatorMetadata.iconPng = responseData.airswapLight.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.zeroEx){
            aggregator = "zeroEx";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.zeroEx.color
                newAggregatorMetadata.title = responseData.zeroEx.title
                newAggregatorMetadata.icon = responseData.zeroEx.icon
                newAggregatorMetadata.iconPng = responseData.zeroEx.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.oneInch){
            aggregator = "oneInch";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.oneInch.color
                newAggregatorMetadata.title = responseData.oneInch.title
                newAggregatorMetadata.icon = responseData.oneInch.icon
                newAggregatorMetadata.iconPng = responseData.oneInch.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.pancakeswap){
            aggregator = "pancakeswap";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.pancakeswap.color
                newAggregatorMetadata.title = responseData.pancakeswap.title
                newAggregatorMetadata.icon = responseData.pancakeswap.icon
                newAggregatorMetadata.iconPng = responseData.pancakeswap.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.balancer){
            aggregator = "balancer";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.balancer.color
                newAggregatorMetadata.title = responseData.balancer.title
                newAggregatorMetadata.icon = responseData.balancer.icon
                newAggregatorMetadata.iconPng = responseData.balancer.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.bancor){
            aggregator = "bancor";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.bancor.color
                newAggregatorMetadata.title = responseData.bancor.title
                newAggregatorMetadata.icon = responseData.bancor.icon
                newAggregatorMetadata.iconPng = responseData.bancor.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.curve){
            aggregator = "curve";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.curve.color
                newAggregatorMetadata.title = responseData.curve.title
                newAggregatorMetadata.icon = responseData.curve.icon
                newAggregatorMetadata.iconPng = responseData.curve.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }

        if(responseData.paraswap){
            aggregator = "paraswap";
            newAggregatorMetadata = await AggregatorMetadata.query().where('aggregator', aggregator).first();
            if(!newAggregatorMetadata){
                newAggregatorMetadata = new AggregatorMetadata();
                newAggregatorMetadata.aggregator = aggregator
                newAggregatorMetadata.color = responseData.paraswap.color
                newAggregatorMetadata.title = responseData.paraswap.title
                newAggregatorMetadata.icon = responseData.paraswap.icon
                newAggregatorMetadata.iconPng = responseData.paraswap.iconPng
                newAggregatorMetadata.save();
            }
            aggregatorChainId = await AggregatorChainId.query().where('chainId', chainId).andWhere('aggregator', aggregator).first()
            if(!aggregatorChainId){
                aggregatorChainId = new AggregatorChainId();
                aggregatorChainId.chainId = chainId;
                aggregatorChainId.aggregator = aggregator;
                aggregatorChainId.save();
            }
        }
        

        return responseData;
    }

    async topAssets ({ request, response }) {
        const headers = new Headers();

        headers.append('Content-Type', 'application/json');
        headers.append('Accept', 'application/json');

        headers.append('Access-Control-Allow-Origin', '*');
        headers.append('Access-Control-Allow-Credentials', 'true');
        headers.append('Access-Control-Allow-Headers', '*');

        headers.append('GET', 'POST', 'OPTIONS');
        /////////////////////////////////
        const res = await fetch(`${Metamask_API_URL}/137/topAssets`, {
            method: "GET",
            headers
        });

        const responseData = await res.json();
        let token;
        for(let i = 0; i < responseData.length; i ++){
            token = await PolygonToken.query().where('address', responseData[i].address).first();
            if(token){
                token.topAsset = true;
                token.save();
            }            
        }
        return responseData;
    }
}

module.exports = UpdateDBController