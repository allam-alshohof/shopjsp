const express = require('express');
const shopController = require("../controllers/shop");
const routerb = express.Router();
const path = require('path');
const isAuth = require('../middleware/is-auth');


routerb.get('/',shopController.getIndex);
routerb.get('/products',shopController.getProducts);
routerb.get('/products/:productId',shopController.getProduct);
routerb.get('/cart', isAuth ,shopController.getCart);
routerb.post('/cart', isAuth ,shopController.postCart);
routerb.post('/cart-delete-item', isAuth ,shopController.postCartDeleteProduct);
routerb.get('/orders', isAuth ,shopController.getOrders);
routerb.get('/orders/:orderId', isAuth ,shopController.getInvoice);
routerb.get('/checkout', isAuth ,shopController.getCheckout);
routerb.get('/checkout/cancel' ,shopController.getCheckout);
routerb.get('/checkout/success' ,shopController.postOrder);



module.exports = routerb;