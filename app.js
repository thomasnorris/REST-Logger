var _path = require('path');
var _logger = require(_path.resolve(__dirname, 'Node-Logger', 'app.js'));

var _bodyParser = require('body-parser');
var _express = require('express');
var _app = _express();

const CFG_FILE = _path.resolve(__dirname, 'config', 'config.json');
var _cfg = readJson(CFG_FILE);

_app.use(_bodyParser.json());

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
    else if (!validatePayload(req.body)) {
        var msg = 'Invalid payload given';
        _logger.Error.Async(msg, 'Payload: ' + JSON.stringify(req.body));
        res.status(409).json({
            message: msg,
            payload_format: _cfg.express.payload_format
        });
    }
    // do the log
    else {

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

function validatePayload(payload) {
    var valid = true;
    Object.keys(_cfg.express.payload_format).forEach((key1) => {
        if (valid) {
            valid = Object.keys(payload).some((key2) => {
                if (_cfg.express.payload_format[key1].required) {
                    if (key1.toLowerCase() === key2.toLowerCase())
                        return true;
                    else
                        return false;
                }
                else
                    return true;
            });
        }
    });
    return valid;
}

function readJson(filePath) {
    var fs = require('fs');
    var path = require('path');
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, filePath), 'utf8'));
}