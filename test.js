import test from 'ava';
import ProtobufMessages from './index';

test(t => {
    const
        protobufMessages = new ProtobufMessages([
            {
                file: 'src/main/protobuf/CommonMessages.proto',
                protoPayloadType: 'ProtoPayloadType'
            },
            {
                file: 'src/main/protobuf/OpenApiMessages.proto',
                protoPayloadType: 'ProtoOAPayloadType'
            }
        ]);

    protobufMessages.load();
    protobufMessages.build();

    const
        ProtoPingReq = protobufMessages.getMessageByName('ProtoPingReq'),
        protoPingReq = new ProtoPingReq({
            timestamp: Date.now()
        }),
        clientMsgId = 'test',
        payloadType = 52;

    t.deepEqual(
        protoPingReq.timestamp,
        protobufMessages.decode(
            protobufMessages.encode(payloadType, protoPingReq, clientMsgId)
        ).payload.timestamp
    );
});
