var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');

var app = express();
app.get('/', function(req, res) {
	res.end()
});

app.use(bodyParser.json({ type: 'application/json' }));

app.use(expressValidator());

var postgres = require('./lib/postgres');

function lookupPhoto(req, res, next) {
	var photoID = req.params.id;

	var sql = 'SELECT * FROM photo WHERE id = $1';
	postgres.client.query(sql, [ photoID ], function(err, result) {
		if (err) {
			console.error(err);
			res.statusCode = 500;
			return res.json({ errors: ['Could not retrieve photo']});
		}
		if (result.rows.length === 0) {
			res.statusCode = 404;
			return res.json({ errors: ['Photo not found']});
		}

		req.photo = result.rows[0];
		next();
	});
}

var photoRouter = express.Router();
photoRouter.get('/', function(req, res) {});

function validatePhoto(req, res, next) {
	req.checkBody('description', 'Thanks Darian').notEmpty();
	req.checkBody('album_id', 'Invalid album_id').isNumeric();

	var errors = req.validationErrors();
	if (errors) {
		var response = { errors: [] };
		errors.forEach(function(err) {
			response.errors.push(err.msg);
		});

		res.statusCode = 400;
		return res.json(response);
	}

	return next();
}
photoRouter.post('/', validatePhoto, function(req, res) {
	var sql = 'INSERT INTO photo (description, filepath, album_id) VALUES ($1, $2, $3) RETURNING id';
	var data = [
		req.body.description,
		req.body.filepath,
		req.body.album_id
	];
	postgres.client.query(sql, data, function(err, result) {
		if (err) {
			console.error(err);
			res.statusCode = 500;
			return res.json({
				errors: ['Failed to create photo']
			});
		}

		var newphotoID = result.rows[0].id;
		var sql = 'SELECT * FROM photo WHERE id = $1';
		postgres.client.query(sql, [newphotoID], function(err, result) {
			if (err) {
				console.error(err);
				res.statusCode = 500;
				return res.json({
					errors: ['Could not retrieve photo after create']
				});
			}

			res.statusCode = 201;
			res.json(result.rows[0]);
		});
	});
});
photoRouter.get('/:id', lookupPhoto, function(req, res) {
	res.json(req.photo);
});
photoRouter.patch('/:id', lookupPhoto, function(req, res) {});
photoRouter.delete('/:id', lookupPhoto, function(req, res) {});
app.use('/photo', photoRouter);

var albumRouter = express.Router();
albumRouter.get('/', function(req, res) {});
albumRouter.post('/', function(req, res) {});
albumRouter.get('/:id', function(req, res) {});
albumRouter.patch('/:id', function(req, res) {});
albumRouter.delete('/:id', function(req, res) {});
app.use('/album', albumRouter);

module.exports = app;
