const express = require('express');
const adminController = require('../controllers/admin')
const router = express.Router();
const path = require('path');
const isAuth = require('../middleware/is-auth');
const { check, body } = require('express-validator');


router.get('/add-product', isAuth, adminController.getAddProduct);
router.get('/products', isAuth, adminController.getProducts);
router.post(
    '/add-product',
    [
        check('title')
            .isString()
            .withMessage('The title should only contain characters and numbers')
            .isLength({ min: 3 })
            .trim(),
        check('price')
            .isFloat(),
        body('description')
            .isLength({ min: 4, max: 400 })
            .withMessage('Descpription should be 10 letters at least.')
            .trim()
    ],
    isAuth,
    adminController.postAddProduct
);
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);
router.post(
    '/edit-product',
    [
        check('title')
            .isString()
            .isLength({ min: 3 })
            .trim()
            .withMessage('The title should only contain characters and numbers'),
        check('price')
            .isFloat(),
        check('description')
            .isLength({ min: 4, max: 400 })
            .withMessage('Descpription should be 10 letters at least.')
            .trim()
    ],
    isAuth, adminController.postEditProduct);
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

exports.routes = router; 
