const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { validationResult } = require('express-validator');


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "allam.udemy@gmail.com",
    pass: "seqvnqgddnbbxxww"
  }
});

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: {
      email:'',
      password:''
    },
    validationErrors: []
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message,
    oldInput: {
      email:'',
      password:'',
      confirmPassword:''
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array())
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: {email: email, password:password},
      validationErrors: errors.array()
    });
  }
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password',
          oldInput: {email: email, password:password},
          validationErrors: errors.array()
        });
      }
      bcrypt
        .compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password',
            oldInput: {email: email, password:password},
            validationErrors: []
          });
        }).catch(err => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: {email: email, password: password, confirmPassword: confirmPassword },
      validationErrors: errors.array(),
    });
  }

  return bcrypt
    .hash(password, 12)
    .then(hashedPass => {
      const user = new User({
        email: email,
        password: hashedPass,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(() => {
      res.redirect('/login');
      return transporter.sendMail({
        to: email,
        from: 'nodeshop.com',
        subject: 'Signup succeeded',
        html: '<h1>You successfully signed up!</h1>'
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
  });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getResetPassword = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });

};

exports.postResetPassword = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset')
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email }).then(
      user => {
        if (!user) {
          req.flash('error', 'This email is not signed up ');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.tokenExpire = Date.now() + 3600000;
        return user.save();
      }
    )
      .then(
        () => {
          res.redirect('/');
          transporter.sendMail({
            to: req.body.email,
            from: 'nodeshop.com',
            subject: 'Reset Password ',
            html: `
          <p> follow this <a href="http://localhost:4000/reset/${token}">link </a> to reset your password </p>
          `
          });
        }
      )
      .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, tokenExpire: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
  });

};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const passwordToken = req.body.passwordToken;
  const userId = req.body.userId;
  let resetUser;

  User.findOne({ resetToken: passwordToken, tokenExpire: { $gt: Date.now() }, _id: userId })
    .then(user => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPass => {
      resetUser.password = hashedPass;
      resetUser.resetToken = undefined;
      resetUser.tokenExpire = undefined;
      return resetUser.save();
    }).then(() => {
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
  });
};