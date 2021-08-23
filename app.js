var _path = require('path');
var _logger = require(_path.resolve(__dirname, 'Node-Logger', 'app.js'));

var _bodyParser = require('body-parser');
var _express = require('express');
var _app = _express();

const CFG_FILE = _path.resolve(__dirname, 'config', 'config.json');
var _cfg = readJson(CFG_FILE);

var _mysql = require('mysql');
var _pool = _mysql.createPool(_cfg.sql.connection);

_app.use(_bodyParser.json());

// POST endpoint
_app.post(_cfg.express.endpoint, (req, res) => {
    // authenticated?
    if (!authenticated(req.headers)) {
        var msg = 'Authentication failure';
        _logger.Warning.Async(msg);
        res.status(401).send(msg);
    }
    // body?
    else if (!req.body || Object.keys(req.body).length === 0) {
        var msg = 'No payload given';
        _logger.Error.Async(msg);
        res.status(409).send(msg);
    }
    // valid?
    else if (!payloadValid(req.body)) {
        var msg = 'Invalid payload';
        _logger.Error.Async(msg, 'Payload: ' + JSON.stringify(req.body));
        res.status(409).json({
            message: msg,
            payload_format: _cfg.express.payload_format
        });
    }
    // do the log
    else {
        (async (res) => {
            executeLog(req.body)
                .then((resp) => {
                    if (_cfg.debug_mode)
                        res.status(200).send(resp);
                    else
                        res.status(200).send('Log successful.');

                    _logger.Info.Async('Logged REST request');
                })
                .catch((err) => {
                    if (_cfg.debug_mode)
                        res.status(500).send(err);
                    else
                        res.status(500).send('Log unsuccessful.');

                    _logger.Error.Async('Failed to log REST request');
                });
        })(res);
    }
});

_app.set('json spaces', 4);
_app.listen(_cfg.express.port);

_logger.Init.Async('Server listening', 'localhost:' + _cfg.express.port);
console.log('Server listening on port ' + _cfg.express.port);

function authenticated(headers) {
    return Object.keys(headers).some((key) => {
        if (key.toLowerCase() === _cfg.express.auth.key.toLowerCase())
            if (headers[key] === _cfg.express.auth.value)
                return true;

        return false;
    });
}

function payloadValid(payload) {
    var valid = true;
    Object.keys(_cfg.express.payload_format).forEach((key1) => {
        if (valid) {
            valid = Object.keys(payload).some((key2) => {
                if (_cfg.express.payload_format[key1].required)
                    return key1 === key2;
                else
                    return true;
            });
        }
    });
    return valid;
}

// modified version of executeLog from the Node-Logger submodule
function executeLog(payload) {
    return new Promise((resolve, reject) => {
        _pool.getConnection((err, connection) => {
            if (err)
                resolve(err);
            else {
                var query = 'call ' + _cfg.sql.connection.database + '.' + _cfg.sql.sp.log_rest_request + '(';
                query += connection.escape(payload.app_ID || _cfg.defaults.app_ID) + ', ' + connection.escape(payload.log_type_ID || _cfg.defaults.log_type_ID) + ', ';
                query += connection.escape(payload.message || _cfg.defaults.message) + ', ' + connection.escape(payload.details)  + ');';

                connection.query(query, (err, res, fields) => {
                    connection.release();
                    if (err)
                        resolve(err);
                    else
                        resolve(res);
                });
            }
        });
    });
}

function readJson(filePath) {
    var fs = require('fs');
    var path = require('path');
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath), 'utf8'));
}