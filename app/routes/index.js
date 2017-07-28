'use strict';

var path = process.cwd();
var User = require("../models/users");
var Book = require("../models/books");
var Trade = require("../models/trades");
// var mongoose = require("mongoose");

const TRADE_STATUS = {
	PENDING: 0,
	ACCEPTED: 1,
	DENIED: 2
};

module.exports = function (app, passport) {

	function isLoggedIn (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		} else {
			res.redirect('/');
		}
	}

	app.route('/')
		.get(function (req, res) {
			res.render("index", {
				isLoggedIn: req.isAuthenticated()
			});
		});
		
	app.route('/settings') // OK
		.get(isLoggedIn, function (req, res) {
			User.findOne({ _id: req.user.id }).exec((err, user) => {
				if(err) {
					throw err;
				}
				
				res.render("settings", {
					isLoggedIn: req.isAuthenticated(),
					name: user.settings.name || "",
					city: user.settings.city || "",
					state: user.settings.state || ""
				});
			});
			
		});

	app.route('/my-books') // OK
		.get(isLoggedIn, function (req, res) {
			Book.find({
				userId: req.user.id
			}).exec((err, books) => {
				if(err) throw err;
				
				res.render("user-books", {
					isLoggedIn: req.isAuthenticated(),
					books: books
				});
			});
		});
		
	app.route('/books') // OK
		.get(isLoggedIn, function (req, res) {
			Book.find({}).exec((err, books) => {
				if(err) throw err;
				
				res.render("books", {
					isLoggedIn: req.isAuthenticated(),
					books: books.map((book) => {
						book.disabled = (book.userId == req.user.id);
						return book;
					})
				});
			});
		});
		
	app.route('/trade-requests')
		.get(isLoggedIn, function (req, res) {
			Trade.find({ ownerId: req.user.id }).exec((err, trades) => {
				if(err) throw err;
				
				Promise.all(trades.map((trade) => Book.findOne({ _id: trade.bookId }))).then((books) => {
					for(let i = 0; i < trades.length; i++) {
						trades[i].name = books[i].name;
					}
					
					console.log(trades);
					
					res.render("trade-requests", {
						isLoggedIn: req.isAuthenticated(),
						pendingTrades: trades.filter((trade) => trade.status == TRADE_STATUS.PENDING),
						acceptedTrades: trades.filter((trade) => trade.status == TRADE_STATUS.ACCEPTED),
						deniedTrades: trades.filter((trade) => trade.status == TRADE_STATUS.DENIED)
					});
				}).catch(err => {
					throw err;	
				});
			});
		});
		
	app.route('/my-requests')
		.get(isLoggedIn, function (req, res) {
			Trade.find({ askerId: req.user.id }).exec((err, trades) => {
				if(err) throw err;
				
				Promise.all(trades.map((trade) => Book.findOne({ _id: trade.bookId }))).then((books) => {
					for(let i = 0; i < trades.length; i++) {
						trades[i].name = books[i].name;
						
						switch(trades[i].status) {
							case TRADE_STATUS.PENDING:
								trades[i].statusText = "PENDING";
								break;
							case TRADE_STATUS.ACCEPTED:
								trades[i].statusText = "ACCEPTED";
								break;
							case TRADE_STATUS.DENIED:
								trades[i].statusText = "DENIED";
								break;
						}
					}
					
					console.log(trades);
					
					res.render("user-requests", {
						isLoggedIn: req.isAuthenticated(),
						trades: trades
					});
				}).catch(err => {
					throw err;	
				});
			});
		});
	
	app.route('/logout') // OK
		.get(function (req, res) {
			req.logout();
			res.redirect('/');
		});
	
	// --------------------------------
	// API
	// --------------------------------
	
	app.route('/api/settings') // OK
		.post(isLoggedIn, function (req, res) {
			User.findOne({ _id: req.user.id }).exec((err, user) => {
				if(err) {
					throw err;
				}
				
				if(req.body.name) {
					user.settings.name = req.body.name;
				}
				
				if(req.body.city) {
					user.settings.city = req.body.city;
				}
				
				if(req.body.state) {
					user.settings.state = req.body.state;
				}
				
				user.save((err) => {
					if(err) {
						throw err;
					}
					
					res.redirect("/");
				});
			});
		});
		
	app.route('/api/add-book') // OK
		.post(isLoggedIn, function (req, res) {
			
			if(req.body.name != "") {
				let book = new Book();
				book.name = req.body.name;
				book.userId = req.user.id;
				book.save((err) => {
					if(err) throw err;
					
					res.redirect("/my-books");
				});
			}else {
				res.redirect("/my-books");
			}
		});
		
	app.route('/api/delete-book/:id') // OK
		.get(isLoggedIn, function (req, res) {
			Book.findOne({ userId: req.user.id, _id: req.params.id }).remove((err) => {
				if(err) {
					throw err;
				}
				
				Trade.find({ bookId: req.params.id }).remove((err) => {
					if(err) throw err;
					
					res.redirect("/my-books");
				});
			});
		});
		
	app.route('/api/delete-trade/:id') // OK
		.get(isLoggedIn, function (req, res) {
			Trade.findOne({ askerId: req.user.id, _id: req.params.id }).remove((err, trade) => {
				if(err) {
					throw err;
				}
				
				res.redirect("/my-requests");
			});
		});
		
	app.route('/api/ask/:id') // OK
		.get(isLoggedIn, function (req, res) {
			if(req.params.id) {
				Book.findOne({ _id: req.params.id }).exec((err, book) => {
					if(err) throw err;
					
					let trade = new Trade();
					
					trade.ownerId = book.userId;
					trade.askerId = req.user.id;
					trade.bookId = req.params.id;
					trade.status = TRADE_STATUS.PENDING;
					
					trade.save((err) => {
						if(err) throw err;
						
						res.redirect("/my-requests");
					});	
				});
			}else {
				res.redirect("/books");
			}
		});
		
	app.route('/api/accept/:id')
		.get(isLoggedIn, function (req, res) {
			if(req.params.id) {
				Trade.findOne({ _id: req.params.id, ownerId: req.user.id }).exec((err, trade) => {
					if(err) throw err;

					trade.status = TRADE_STATUS.ACCEPTED;
					
					trade.save((err) => {
						if(err) throw err;
						
						res.redirect("/trade-requests");
					});	
				});
			}else {
				res.redirect("/trade-requests");
			}
		});
		
	app.route('/api/deny/:id')
		.get(isLoggedIn, function (req, res) {
			if(req.params.id) {
				Trade.findOne({ _id: req.params.id, ownerId: req.user.id }).exec((err, trade) => {
					if(err) throw err;

					trade.status = TRADE_STATUS.DENIED;
					
					trade.save((err) => {
						if(err) throw err;
						
						res.redirect("/trade-requests");
					});	
				});
			}else {
				res.redirect("/trade-requests");
			}
		});

	app.route('/auth/github') // OK
		.get(passport.authenticate('github'));

	app.route('/auth/github/callback') // OK
		.get(passport.authenticate('github', {
			successRedirect: '/',
			failureRedirect: '/'
		}));
};
