/* This file is for testing RPC methods.
 */

var util = require('../lib/util');
var asrt;
var edbModule;

if (typeof(window) === "undefined") {
    asrt = require('assert');
    edbModule = require("../index");
} else {
    asrt = assert;
    edbModule = edbFactory;
}

var test_data = require('./testdata/testdata.json');
var template = require('./mock/test_template');

var handlers = template.getHandlers(test_data);
var port = 13378;

var http = require('http');

var requestData = {
    priv_validator: test_data.chain_data.priv_validator,
    genesis: test_data.chain_data.genesis,
    max_duration: 10
};

var server = http.createServer(function (request, response) {
    var message = '';

    request.on('data', function(chunk) {
        message += chunk.toString();
    });

    request.on('end', function() {
        var resp = {
            jsonrpc: "2.0",
            id: "",
            result: null,
            error: null
        };

        var req, errMsg;

        try {
            req = JSON.parse(message);
        } catch (error) {
            errMsg = "Failed to parse message: " + error;
            console.error(errMsg);
            resp.error = {
                code : -32700,
                message : errMsg
            };
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify(resp));
            return;
        }

        resp.id = req.id;
        if (!isRequest(req)) {
            errMsg = "Message is not a proper json-rpc 2.0 request: " + message;
            console.error(errMsg);
            resp.error = {
                code : -32600,
                message : errMsg
            };
        } else if(!handlers.hasOwnProperty(req.method)){
            errMsg = "Method not found: " + req.method;
            console.error(errMsg);
            resp.error = {
                code : -32601,
                message : errMsg
            };
        } else {
            var method = handlers[req.method];
            resp.result = method(req.params);
        }
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(resp));
    });

    function isRequest(req) {
        // Check params is null or array?
        return req instanceof Object && typeof(req.jsonrpc) === "string" && req.jsonrpc === "2.0" &&
            typeof(req.method) === "string" && typeof(req.id) === "string";
    }

});

var edb;

describe('TheloniousMockHttp', function () {

    before(function (done) {
        server.listen(port, function(){
            console.log("Bound");
            console.log(server.address());

            edb = edbModule.createInstance("http://127.0.0.1:" + port.toString());
            edb.start(function () {});
            done();
        });
    });

    describe('.consensus', function () {

        describe('#getState', function () {
            it("should get the consensus state", function (done) {
                var exp = test_data.output.consensus_state;
                edb.consensus().getState(check(exp, done, [modifyConsensusStartTime]));
            });
        });

        describe('#getValidators', function () {
            it("should get the validators", function (done) {
                var exp = test_data.output.validators;
                edb.consensus().getValidators(check(exp, done));
            });
        });

    });

    describe('.events', function () {

        var mockEventId = "test";
        var mockSubId = "1234123412341234123412341234123412341234123412341234123412341234";
        var mockEvent = {};
        var mockUnsubRet = true;

        describe('#eventSubscribe', function () {
            it("should subscribe to event", function (done) {
                var exp = mockSubId;
                edb.events().subscribe(mockEventId, check(exp, done));
            });
        });

        describe('#eventPoll', function () {
            it("should poll event", function (done) {
                // For now
                var exp = mockEvent;
                edb.events().poll(mockSubId, check(exp, done));
            });
        });

        describe('#eventUnubscribe', function () {
            it("should subscribe to event", function (done) {
                var exp = mockUnsubRet;
                edb.events().unsubscribe(mockSubId, check(exp, done));
            });
        });

    });

    describe('.network', function () {

        describe('#getInfo', function () {
            var exp = test_data.output.network_info;
            it("should get the network info", function (done) {
                edb.network().getInfo(check(exp, done));
            });
        });

        describe('#getClientVersion', function () {
            var exp = test_data.output.client_version;
            it("should get the network info", function (done) {
                edb.network().getClientVersion(check(exp, done));
            });
        });

        describe('#getMoniker', function () {
            var exp = test_data.output.moniker;
            it("should get the moniker", function (done) {
                edb.network().getMoniker(check(exp, done));
            });
        });

        describe('#isListening', function () {
            it("should get the listening value", function (done) {
                var exp = test_data.output.listening;
                edb.network().isListening(check(exp, done));
            });
        });

        describe('#getListeners', function () {
            it("should get the listeners", function (done) {
                var exp = test_data.output.listeners;
                edb.network().getListeners(check(exp, done));
            });
        });

        describe('#getPeers', function () {
            it("should get the peers", function (done) {
                var exp = test_data.output.peers;
                edb.network().getPeers(check(exp, done));
            });
        });

    });

    describe('.txs', function () {

        /*
         describe('#broadcastTx', function () {
         it("should broadcast a tx", function (done) {
         edb.txs().broadcastTx(params.tx, ret(checkBroadcastTx, done));
         });
         });
         */


        describe('#transact contract create', function () {
            it("should send a contract create tx to an address", function (done) {
                var tx_create = test_data.input.tx_create;
                var exp = test_data.output.tx_create_receipt;
                edb.txs().transact(tx_create.priv_key, tx_create.address, tx_create.data,
                    tx_create.gas_limit, tx_create.fee, null, check(exp, done));
            });
        });

        describe('#transact', function () {
            it("should transact with the account at the given address", function (done) {
                var tx = test_data.input.tx;
                var exp = test_data.output.tx_receipt;
                edb.txs().transact(tx.priv_key, tx.address, tx.data, tx.gas_limit, tx.fee,
                    null, check(exp, done));
            });
        });

        describe('#getUnconfirmedTxs', function () {
            it("should get the unconfirmed txs", function (done) {
                var exp = test_data.output.unconfirmed_txs;
                edb.txs().getUnconfirmedTxs(check(exp, done));
            });
        });

        /*
         describe('#call', function () {
         it("should call the given address using the given data", function (done) {
         edb.txs().call(results.new_contract_address, params.txData, ret(checkCall, done));
         });
         });
         */

        describe('#callCode', function () {
            it("should callCode with the given code and data", function (done) {
                var call_code = test_data.input.call_code;
                var exp = test_data.output.call_code;
                edb.txs().callCode(call_code.code, call_code.data, check(exp, done));
            });

        });

    });

    describe('.accounts', function () {

        describe('#genPrivAccount', function () {
            it("should get a new private account", function (done) {
                // Just make sure the basic data are there and are of the correct type...
                var exp = test_data.output.gen_priv_account;
                edb.accounts().genPrivAccount(null, check(exp, done, [modifyPrivateAccount]));
            });
        });

        describe('#getAccounts', function () {
            it("should get all accounts", function (done) {
                var exp = test_data.output.accounts;
                edb.accounts().getAccounts(check(exp, done));
            });
        });

        describe('#getAccount', function () {
            it("should get the account", function (done) {
                var addr = test_data.input.account_address;
                var exp = test_data.output.account;
                edb.accounts().getAccount(addr, check(exp, done));
            });
        });

        describe('#getStorage', function () {
            it("should get the storage", function (done) {
                var addr = test_data.input.account_address;
                var exp = test_data.output.storage;
                edb.accounts().getStorage(addr, check(exp, done));
            });
        });

        describe('#getStorageAt', function () {
            it("should get the storage at the given key", function (done) {
                var addr = test_data.input.account_address;
                var sa = test_data.input.storage_address;
                var exp = test_data.output.storage_at;
                edb.accounts().getStorageAt(addr, sa, check(exp, done));
            });
        });

    });

    describe('.blockchain', function () {

        describe('#getInfo', function () {
            it("should get the blockchain info", function (done) {
                var exp = test_data.output.blockchain_info;
                edb.blockchain().getInfo(check(exp, done));
            });
        });

        describe('#getChainId', function () {
            it("should get the chain id", function (done) {
                var exp = test_data.output.chain_id;
                edb.blockchain().getChainId(check(exp, done));
            });
        });

        describe('#getGenesisHash', function () {
            var exp = test_data.output.genesis_hash;
            it("should get the genesis hash", function (done) {
                edb.blockchain().getGenesisHash(check(exp, done));
            });
        });

        describe('#getLatestBlockHeight', function () {
            it("should get the latest block height", function (done) {
                var exp = test_data.output.latest_block_height;
                edb.blockchain().getLatestBlockHeight(check(exp, done));
            });
        });

        describe('#getBlocks', function () {
            it("should get the blocks between min, and max height", function (done) {
                var range = test_data.input.block_range;
                var exp = test_data.output.blocks;
                edb.blockchain().getBlocks(check(exp, done));
            });
        });

        /*
         describe('#getBlock', function () {
         it("should get the block at the given height", function (done) {
         edb.blockchain().getBlock(params.height, ret(checkBlock, done));
         });
         });
         */
    });
});

// Expected is the expected data. done is the mocha done-function, modifiers are
// used to overwrite fields in the return-data that should not be included in the
// tests (like certain timestamps for example).
function check(expected, done, fieldModifiers) {
    return function (error, data) {
        if (error) {
            console.log(error);
        }
        if (fieldModifiers && fieldModifiers.length > 0) {
            for (var i = 0; i < fieldModifiers.length; i++) {
                fieldModifiers[i](data);
            }
        }
        asrt.ifError(error, "Failed to call rpc method.");
        asrt.deepEqual(data, expected);
        done();
    };
}

function modifyConsensusStartTime(cs) {
    cs["start_time"] = "";
}

function modifyPrivateAccount(pa) {
    pa.address = "";
    pa.pub_key[1] = "";
    pa.priv_key[1] = "";
}