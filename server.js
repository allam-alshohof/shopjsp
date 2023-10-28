const exp = require('express');
const path = require('path');
const csrf = require('csurf');
//const epressHbs=require('express-handlebars');
const parser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash');
const multer = require('multer');



const adminRoutes = require('./routes/admin');
const shopRouter = require('./routes/shop');
const authRouter = require('./routes/auth');
const controller = require('./controllers/error');
const User = require('./models/user');

const MONGO_URI = 'mongodb+srv://ash:2049500991623461@cluster0.dezngh0.mongodb.net/shop';

const app = exp();
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
    destination:(req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null,new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null,true);
    } else {
        cb(null,false);
    }
};
const store = new MongoStore({
    uri: MONGO_URI,
    collection: 'sessions'
});

//app.engine('handlebars',epressHbs)
app.set('view engine', 'ejs');
app.use(parser.urlencoded({ extended: true }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))
app.use(exp.static(path.join(__dirname, 'Public')));
app.use('/images',exp.static(path.join(__dirname, 'images')));
app.use(
    session({
        secret: 'mysecrestabcdeddfrgthyjuk', 
        resave: false, 
        saveUninitialized: false, 
        store: store 
    }));// this session automatically creates a cookie and we can configure it also  
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.token = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
    .then(user => {
        if (!user) {
            return next();
        }
        req.user = user;
        next();
    }).catch(err => {
        next(new Error(err));
    });
});

app.use(shopRouter);
app.use(authRouter);
app.use('/admin', adminRoutes.routes);
app.get('/500',controller.get500Page);
app.use(controller.get404Page);
app.use((error, req, res, next) => {
    console.log(error);
    res.status(500).render('500', {
        pageTitle:'Internal Error',
        path : '/500',
        isAuthenticated: req.session.isLoggedIn
    });   
});

mongoose
.connect(MONGO_URI)
.then(result => {
    app.listen(4000);
})
.catch(err => console.log(err));