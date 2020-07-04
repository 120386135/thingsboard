/**
 * Copyright © 2016-2020 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.transport.lwm2m.server;

import com.google.gson.JsonElement;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.leshan.core.node.LwM2mNode;
import org.eclipse.leshan.core.node.LwM2mObject;
import org.eclipse.leshan.core.node.LwM2mResource;
import org.eclipse.leshan.core.observation.Observation;
import org.eclipse.leshan.core.request.ContentFormat;
import org.eclipse.leshan.core.request.DiscoverRequest;
import org.eclipse.leshan.core.response.*;
import org.eclipse.leshan.server.californium.LeshanServer;
import org.eclipse.leshan.server.registration.Registration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import org.thingsboard.server.common.transport.TransportService;
import org.thingsboard.server.common.transport.TransportServiceCallback;
import org.thingsboard.server.common.transport.adaptor.AdaptorException;
import org.thingsboard.server.common.transport.service.DefaultTransportService;
import org.thingsboard.server.gen.transport.TransportProtos;
import org.thingsboard.server.transport.lwm2m.server.adaptors.LwM2MJsonAdaptor;
import org.thingsboard.server.transport.lwm2m.server.secure.LwM2mInMemorySecurityStore;
import org.thingsboard.server.transport.lwm2m.server.adaptors.ReadResultAttrTel;


import java.util.NoSuchElementException;
import java.util.UUID;

import static io.netty.handler.codec.mqtt.MqttConnectReturnCode.*;
import static org.thingsboard.server.transport.lwm2m.server.LwM2MTransportHandler.*;


@Service("LwM2MTransportService")
@ConditionalOnExpression("'${service.type:null}'=='tb-transport' || ('${service.type:null}'=='monolith' && '${transport.lwm2m.enabled}'=='true')")
@Slf4j
public class LwM2MTransportService {

    private final UUID sessionId = UUID.randomUUID();

    @Autowired
    private LwM2MJsonAdaptor adaptor;

    @Autowired
    private TransportService transportService;

    @Autowired
    private LeshanServer lwServer;

    @Autowired
    private LwM2MTransportContextServer context;

    @Autowired
    private LwM2MTransportRequest lwM2MTransportRequest;

    @Autowired
    LwM2mInMemorySecurityStore lwM2mInMemorySecurityStore;

    public void onRegistered(Registration registration) {
        String endpointId = registration.getEndpoint();
        String lwm2mVersion = registration.getLwM2mVersion();
        LwM2mResponse cResponse = this.lwM2MTransportRequest.doGet(endpointId, "/1", GET_TYPE_OPER_READ, ContentFormat.TLV.getName());
        log.info("cResponse1: [{}]", cResponse);
       cResponse = doTrigerServer(endpointId, "/1/0/8", null);
        if (cResponse == null|| cResponse.getCode().getCode() == 500) {
            doTrigerServer(endpointId, "/3/0/22", null);
//            cResponse = doTrigerServer(endpointId, "/1/0/8", null);
        }
        log.info("cResponse2: [{}]", cResponse);
        log.info("[{}] [{}] Received endpoint registration version event", endpointId, lwm2mVersion);
    }

    public void processDevicePublish(JsonElement msg, String topicName, int msgId, String clientEndpoint) {
        TransportProtos.SessionInfoProto sessionInfo = getValidateSessionInfo(clientEndpoint);
        if (sessionInfo != null) {
            try {
                if (topicName.equals(DEVICE_TELEMETRY_TOPIC)) {
                    TransportProtos.PostTelemetryMsg postTelemetryMsg = adaptor.convertToPostTelemetry(msg);
                    transportService.process(sessionInfo, postTelemetryMsg, getPubAckCallback(msgId, postTelemetryMsg));
                } else if (topicName.equals(DEVICE_ATTRIBUTES_TOPIC)) {
                    TransportProtos.PostAttributeMsg postAttributeMsg = adaptor.convertToPostAttributes(msg);
                    transportService.process(sessionInfo, postAttributeMsg, getPubAckCallback(msgId, postAttributeMsg));
                }
            } catch (AdaptorException e) {
                log.warn("[{}] Failed to process publish msg [{}][{}]", sessionId, topicName, msgId, e);
                log.info("[{}] Closing current session due to invalid publish msg [{}][{}]", sessionId, topicName, msgId);

            }
        }
    }

    private <T> TransportServiceCallback<Void> getPubAckCallback(final int msgId, final T msg) {
        return new TransportServiceCallback<Void>() {
            @Override
            public void onSuccess(Void dummy) {
                log.trace("[{}] Published msg: {}", sessionId, msg);
            }

            @Override
            public void onError(Throwable e) {
                log.trace("[{}] Failed to publish msg: {}", sessionId, msg, e);
            }
        };
    }

    private TransportProtos.SessionInfoProto getValidateSessionInfo(String endpointId) {
        TransportProtos.SessionInfoProto sessionInfo = null;
        TransportProtos.ValidateDeviceCredentialsResponseMsg msg = context.getSessions().get(endpointId);
        if (msg == null || msg.getDeviceInfo() == null) {
            log.warn("[{}] [{}]", endpointId, CONNECTION_REFUSED_NOT_AUTHORIZED.toString());
        } else {
            sessionInfo = TransportProtos.SessionInfoProto.newBuilder()
                    .setNodeId(context.getNodeId())
                    .setSessionIdMSB(sessionId.getMostSignificantBits())
                    .setSessionIdLSB(sessionId.getLeastSignificantBits())
                    .setDeviceIdMSB(msg.getDeviceInfo().getDeviceIdMSB())
                    .setDeviceIdLSB(msg.getDeviceInfo().getDeviceIdLSB())
                    .setTenantIdMSB(msg.getDeviceInfo().getTenantIdMSB())
                    .setTenantIdLSB(msg.getDeviceInfo().getTenantIdLSB())
                    .setDeviceName(msg.getDeviceInfo().getDeviceName())
                    .setDeviceType(msg.getDeviceInfo().getDeviceType())
                    .build();
            transportService.process(sessionInfo, DefaultTransportService.getSessionEventMsg(TransportProtos.SessionEvent.OPEN), null);
            log.info("[{}] Client connected!", sessionId);
        }
        return sessionInfo;
    }

    public void updatedReg(Registration registration) {
        String endpointId = registration.getEndpoint();
        String smsNumber = registration.getSmsNumber() == null ? "" : registration.getSmsNumber();
        String lwm2mVersion = registration.getLwM2mVersion();
        log.info("[{}] [{}] Received endpoint updated registration version event", endpointId, lwm2mVersion);
        ReadResultAttrTel readResultAttrTel = doGetAttributsTelemetry(endpointId);
        processDevicePublish(readResultAttrTel.getPostAttribute(), DEVICE_ATTRIBUTES_TOPIC, -1, endpointId);
        processDevicePublish(readResultAttrTel.getPostTelemetry(), DEVICE_TELEMETRY_TOPIC, -1, endpointId);
    }

    public void unReg(Registration registration) {
        String endpointId = registration.getEndpoint();
        log.info("[{}] Received endpoint un registration version event", endpointId);
        lwM2mInMemorySecurityStore.remove(endpointId, false);
        context.getSessions().remove(endpointId);
    }

    public void onSleepingDev(Registration registration) {
        String endpointId = registration.getEndpoint();
        String smsNumber = registration.getSmsNumber() == null ? "" : registration.getSmsNumber();
        String lwm2mVersion = registration.getLwM2mVersion();
        log.info("[{}] [{}] Received endpoint Sleeping version event", endpointId, lwm2mVersion);
        //TODO: associate endpointId with device information.
    }

    public void onAwakeDev(Registration registration) {
        String endpointId = registration.getEndpoint();
        String smsNumber = registration.getSmsNumber() == null ? "" : registration.getSmsNumber();
        String lwm2mVersion = registration.getLwM2mVersion();
        log.info("[{}] [{}] Received endpoint Awake version event", endpointId, lwm2mVersion);
        //TODO: associate endpointId with device information.
    }

    public void observOnResponse(Observation observation, Registration registration, ObserveResponse response) {
        //TODO: associate endpointId with device information.
    }

    /**
     * /clients/endPoint/LWRequest/discover : do LightWeight M2M discover request on a given client.
     */
    public DiscoverResponse getDiscover(String target, String clientEndpoint, String timeoutParam) throws InterruptedException {
        DiscoverRequest request = new DiscoverRequest(target);
        return this.lwServer.send(getRegistration(clientEndpoint), request, this.context.getTimeout());
    }

    public Registration getRegistration(String clientEndpoint) {
        return this.lwServer.getRegistrationService().getByEndpoint(clientEndpoint);
    }

    @SneakyThrows
    public ReadResultAttrTel doGetAttributsTelemetry(String clientEndpoint) {
        ReadResultAttrTel readResultAttrTel = new ReadResultAttrTel();
        Registration registration = lwServer.getRegistrationService().getByEndpoint(clientEndpoint);
        registration.getAdditionalRegistrationAttributes().entrySet().forEach(entry -> {
            log.info("Attributes: Key : [{}] Value : [{}]", entry.getKey(), entry.getValue());
            readResultAttrTel.getPostAttribute().addProperty(entry.getKey(), entry.getValue());
        });
        lwServer.getModelProvider().getObjectModel(registration).getObjectModels().forEach(om -> {
            String idObj = String.valueOf(om.id);
            LwM2mResponse cResponse = lwM2MTransportRequest.doGet(clientEndpoint, "/" + idObj, GET_TYPE_OPER_READ, ContentFormat.TLV.getName());
            if (cResponse != null) {
                LwM2mNode content = ((ReadResponse) cResponse).getContent();
                ((LwM2mObject) content).getInstances().entrySet().stream().forEach(instance -> {
                    String instanceId = String.valueOf(instance.getValue().getId());
                    om.resources.entrySet().stream().forEach(resOm -> {
                        String attrTelName = om.name + "_" + instanceId + "_" + resOm.getValue().name;
                        /** Attributs: om.id: Security, Server, ACL & 'R' ? */
//                        if (resOm.getValue().operations.name().equals("R") || om.id <= 2 ) {
                        if (om.id <= 2 ) {
                            readResultAttrTel.getPostAttribute().addProperty(attrTelName, "");
                        } else {
                            readResultAttrTel.getPostTelemetry().addProperty(attrTelName, "");
                        }
                    });

                    instance.getValue().getResources().entrySet().stream().forEach(resource -> {
                        int resourceId = resource.getValue().getId();
                        String resourceValue = getResourceValueToString(resource.getValue());
                        String attrTelName = om.name + "_" + instanceId + "_" + om.resources.get(resourceId).name;
                        log.info("resource.getValue() [{}] : [{}] -> [{}]", attrTelName, resourceValue, om.resources.get(resourceId).operations.name());
                        if (readResultAttrTel.getPostAttribute().has(attrTelName)) {
                            readResultAttrTel.getPostAttribute().remove(attrTelName);
                            readResultAttrTel.getPostAttribute().addProperty(attrTelName, resourceValue);
                        }
                        else if (readResultAttrTel.getPostTelemetry().has(attrTelName))  {
                            readResultAttrTel.getPostTelemetry().remove(attrTelName);
                            readResultAttrTel.getPostTelemetry().addProperty(attrTelName, resourceValue);
                        }
                    });

                });
            }
        });
        return readResultAttrTel;
    }

    public LwM2mResponse doTrigerServer(String clientEndpoint, String target, String param) {
        param = param != null  ? param : "";
        return lwM2MTransportRequest.doPost(clientEndpoint, target, POST_TYPE_OPER_EXECUTE, ContentFormat.TLV.getName(), param);
   }


    private String getResourceValueToString(LwM2mResource resource) {
        Object resValue;
        try {
            resValue = resource.getValues();
        } catch (NoSuchElementException e) {
            resValue = resource.getValue();
        }
        return String.valueOf(resValue);
    }
}
