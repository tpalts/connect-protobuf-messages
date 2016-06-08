'use strict';

var protobuf = require('protobufjs');

var ConnectProtobufMessages = function (params) {
    this.params = params;
    this.builder = undefined;
    this.payloadTypes = {};
    this.names = {};
    this.messages = {};
    this.enums = {};
};

ConnectProtobufMessages.prototype.encode = function (payloadType, params, clientMsgId) {
    var Message = this.getMessageByPayloadType(payloadType);
    var message = new Message(params);

    return this.wrap(payloadType, message, clientMsgId).encode();
};

ConnectProtobufMessages.prototype.wrap = function (payloadType, message, clientMsgId) {
    var ProtoMessage = this.getMessageByName('ProtoMessage');

    return new ProtoMessage({
        payloadType: payloadType,
        payload: message.toBuffer(),
        clientMsgId: clientMsgId
    });
};

ConnectProtobufMessages.prototype.decode = function (buffer) {
    var ProtoMessage = this.getMessageByName('ProtoMessage');
    var protoMessage = ProtoMessage.decode(buffer);
    var payloadType = protoMessage.payloadType;

    return {
        msg: this.getMessageByPayloadType(payloadType).decode(protoMessage.payload),
        payloadType: payloadType,
        clientMsgId: protoMessage.clientMsgId
    };
};

ConnectProtobufMessages.prototype.load = function () {
    this.params.map(function (param) {
        this.builder = protobuf.loadProtoFile(param.file, this.builder);
    }, this);
};


ConnectProtobufMessages.prototype.markFileAsLoadedForImport = function (protoFile) {
    this.rootUrl = this.rootUrl || (protoFile.url.replace(/\/[^\/]*$/, '') + '/');
    this.builder.files[this.rootUrl + protoFile.name] = true;
};

ConnectProtobufMessages.prototype.loadFile = function (protoFile) {
    this.builder = protobuf.loadProtoFile(protoFile.url, this.builder);
    this.markFileAsLoadedForImport(protoFile);
};

ConnectProtobufMessages.prototype.build = function () {
    var builder = this.builder;

    builder.build();

    var messages = [];
    var enums = [];

    builder.ns.children.forEach(function (reflect) {
        var className = reflect.className;

        if (className === 'Message') {
            messages.push(reflect);
        } else if (className === 'Enum') {
            enums.push(reflect);
        }
    }, this);

    messages
        .filter(function (message) {
            return typeof this.findPayloadType(message) === 'number';
        }, this)
        .forEach(function (message) {
            var name = message.name;

            var messageBuilded = builder.build(name);

            this.messages[name] = messageBuilded;

            var payloadType = this.findPayloadType(message);

            this.names[name] = {
                messageBuilded: messageBuilded,
                payloadType: payloadType
            };
            this.payloadTypes[payloadType] = {
                messageBuilded: messageBuilded,
                name: name
            };
        }, this);

    enums
        .forEach(function (enume) {
            var name = enume.name;
            this.enums[name] = builder.build(name);
        }, this);

    this.buildWrapper();
};

ConnectProtobufMessages.prototype.buildWrapper = function () {
    var name = 'ProtoMessage';
    var messageBuilded = this.builder.build(name);
    this.messages[name] = messageBuilded;
    this.names[name] = {
        messageBuilded: messageBuilded,
        payloadType: undefined
    };
};

ConnectProtobufMessages.prototype.findPayloadType = function (message) {
    var field = message.children.find(function (field) {
        return field.name === 'payloadType';
    });

    if (field) {
        return field.defaultValue;
    }
};

ConnectProtobufMessages.prototype.getMessageByPayloadType = function (payloadType) {
    return this.payloadTypes[payloadType].messageBuilded;
};

ConnectProtobufMessages.prototype.getMessageByName = function (name) {
    return this.names[name].messageBuilded;
};

ConnectProtobufMessages.prototype.getPayloadTypeByName = function (name) {
    return this.names[name].payloadType;
};

module.exports = ConnectProtobufMessages;
