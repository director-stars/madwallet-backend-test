'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route')

Route.on('/').render('welcome')

Route.group(() => {
    Route.get("trades", "BscController.trades");
    Route.get("tokens", "BscController.tokens");
    Route.get("token", "BscController.token");
    Route.get("topAssets", "BscController.topAssets");
    Route.get("aggregatorMetadata", "BscController.aggregatorMetadata");
    Route.get("gasPrices", "BscController.gasPrices");
}).prefix("networks/56");

Route.group(() => {
    Route.get("trades", "EthereumController.trades");
    Route.get("tokens", "EthereumController.tokens");
    Route.get("token", "EthereumController.token");
    Route.get("topAssets", "EthereumController.topAssets");
    Route.get("aggregatorMetadata", "EthereumController.aggregatorMetadata");
    Route.get("gasPrices", "EthereumController.gasPrices");
}).prefix("networks/1");

Route.group(() => {
    Route.get("trades", "PolygonController.trades");
    Route.get("tokens", "PolygonController.tokens");
    Route.get("token", "PolygonController.token");
    Route.get("topAssets", "PolygonController.topAssets");
    Route.get("aggregatorMetadata", "PolygonController.aggregatorMetadata");
    Route.get("gasPrices", "PolygonController.gasPrices");
}).prefix("networks/137");

// Route.group(() => {
//     Route.get("tokens", "UpdateDBController.tokens");
//     Route.get("topAssets", "UpdateDBController.topAssets");
//     Route.get("aggregatorMetadata", "UpdateDBController.aggregatorMetadata");
// }).prefix("db");