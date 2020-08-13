package org.thingsboard.server.transport.lwm2m.server;
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

import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.thingsboard.server.common.transport.TransportContext;
import org.thingsboard.server.gen.transport.TransportProtos;

import java.util.Map;

@Slf4j
@ConditionalOnExpression("'${service.type:null}'=='tb-transport' || ('${service.type:null}'=='monolith' && '${transport.lwm2m.enabled}'=='true')")
@Component("LwM2MTransportContext")
public class LwM2MTransportContextServer extends TransportContext {

    @Getter
    @Value("${transport.lwm2m.timeout:5000}")
    private Long timeout;

    @Getter
    @Value("${transport.lwm2m.model_path_file:}")
    private String modelPathFile;

    @Getter
    @Value("${transport.lwm2m.support_deprecated_ciphers_enable:}")
    private boolean supportDeprecatedCiphersEnable;

    @Getter
    @Value("${transport.lwm2m.secure.key_store_type:}")
    private String keyStoreType;

    @Getter
    @Value("${transport.lwm2m.secure.key_store_path_file:}")
    private String keyStorePathFile;

   @Getter
    @Value("${transport.lwm2m.secure.key_store_path_resource: credentials/serverKeyStore.jks}")
    private String keyStorePathResource;

    @Getter
    @Value("${transport.lwm2m.secure.key_store_password:}")
    private String keyStorePasswordServer;

    @Getter
    @Value("${transport.lwm2m.secure.root_alias:}")
    private String rootAlias;

   @Getter
    @Value("${transport.lwm2m.secure.enable_gen_psk_rpk:}")
    private Boolean enableGenPskRpk;

    @Getter
    @Value("#{${transport.lwm2m.server.bind_address} ?: localhost}")
    private String serverHost;

    @Getter
    @Value("#{${transport.lwm2m.server.bind_port} ?: 5685}")
    private Integer serverPort;

    @Getter
    @Value("#{${transport.lwm2m.server.bind_port_cert} ?: 5687}")
    private Integer serverPortCert;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.start_all} ?: true}")
    private boolean serverStartAll;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.dtls_mode} ?: 3}")
    private Integer serverDtlsMode;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.bind_address} ?: localhost}")
    private String serverSecureHost;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.bind_port} ?: 5686}")
    private Integer serverSecurePort;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.bind_port_cert} ?: 5688}")
    private Integer serverSecurePortCert;

    @Getter
    @Value("#{${transport.lwm2m.server.secure.create_rpk} ?: false}")
    private Boolean serverCreateRPK;

    @Getter
    @Value("${transport.lwm2m.server.secure.public_x:}")
    private String serverPublicX;

    @Getter
    @Value("${transport.lwm2m.server.secure.public_y:}")
    private String serverPublicY;

    @Getter
    @Value("${transport.lwm2m.server.secure.private_s:}")
    private String serverPrivateS;

    @Getter
    @Value("${transport.lwm2m.server.secure.alias:}")
    private String serverAlias;

    @Getter
    @Value("#{${transport.lwm2m.bootstrap.enable} ?: false}")
    private Boolean bootstrapEnable;

    @Getter
    @Value("${transport.lwm2m.secure.redis_url:}")
    private String redisUrl;

    @Getter
    @Setter
    private Map<String /** clientEndPoint */, TransportProtos.ValidateDeviceCredentialsResponseMsg> sessions;
}
