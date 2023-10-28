const Product = require('../models/product');
const Order = require('../models/order');

const fs = require('fs');
const path = require('path');
const PDFDoucument = require('pdfkit');
const stripe = require('stripe')('sk_test_51NHsllSHk3EhIvSWXmBkR0vvQYKmqqUE0MREjflBb8rTlFqIkIu1QnTBjulr8zuGyvgVVeaj04762zD34SUxQ9ty00sxeBHn5U');

const Item_per_page = 2;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find()
            .skip((page - 1) * Item_per_page)
            .limit(Item_per_page);
    })

        .then(products => {
            res.render('shop/product-list', {
                prods: products,
                pageTitle: 'Products',
                path: '/products',
                currentPage: page,
                hasNextPage: Item_per_page * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / Item_per_page),
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                path: '/products',
                pageTitle: product.title,

            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find().countDocuments().then(numProducts => {
        totalItems = numProducts;
        return Product.find()
            .skip((page - 1) * Item_per_page)
            .limit(Item_per_page);
    })

        .then(products => {
            res.render('shop/index', {
                prods: products,
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: Item_per_page * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / Item_per_page),
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getCart = async (req, res, next) => {
    await req.user
        .populate('cart.items.productId')
        .then(user => {
            console.log(user.cart.items);
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products,
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

};
exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId).then(product => {
        return req.user.addToCart(product);
    })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        })
};
exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(() => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

};
exports.postOrder = async (req, res, next) => {
    await req.user
        .populate('cart.items.productId')
        .then(user => {
            console.log(user.cart.items);
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(() => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};
exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            console.log(orders);
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders,
            });
        })
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if (!order) {
            next(new Error('No order found.'));
        }
        if (order.user.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Not authorized '));
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);
        const pdfdoc = new PDFDoucument();

        res.setHeader('Content-type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');//attachment;
        pdfdoc.pipe(fs.createWriteStream(invoicePath));
        pdfdoc.pipe(res);
        pdfdoc.fontSize(26).text('Invoice', {
            underline: true
        });
        pdfdoc.text('-----------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price;
            pdfdoc
                .fontSize(14)
                .text(
                    prod.product.title +
                    ' - ' +
                    prod.quantity +
                    ' x ' +
                    '$' +
                    prod.product.price
                );
        });
        pdfdoc.text('---');
        pdfdoc.fontSize(20).text('Total Price: $' + totalPrice);
        pdfdoc.end();
    }).catch(err => next(err));

    // fs.readFile(invoicePath, (err, data) => {
    //     if (err) {
    //         return next();
    //     }
    //     res.setHeader('Content-type', 'application/pdf');
    //     res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"');
    //     res.send(data);
    // });
};

exports.getCheckout = async (req, res, next) => {
    let products;
    let total = 0;
    await req.user
        .populate('cart.items.productId')
        .then(user => {
            console.log(user.cart.items);
            products = user.cart.items;
            total = 0;
            products.forEach(p => {
                total += p.quantity * p.productId.price;
            });
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(p => {
                    return {
                        price_data: {
                            currency: 'INR',
                            product_data: {
                                name: p.productId.title,
                                description: p.productId.description,
                            },
                            unit_amount: p.productId.price * 100,
                        },
                        quantity: p.quantity,
                    };
                }),
                mode: 'payment',
                success_url: req.protocol + '://' + req.get('host') + '/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'
            });
        })
        .then(session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};