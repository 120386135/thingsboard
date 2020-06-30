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
package org.thingsboard.server.transport.lwm2m.bootstrap;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.californium.core.network.config.NetworkConfig;
import org.eclipse.californium.scandium.config.DtlsConnectorConfig;
import org.eclipse.leshan.core.model.ObjectLoader;
import org.eclipse.leshan.core.model.ObjectModel;
import org.eclipse.leshan.core.model.StaticModel;
import org.eclipse.leshan.server.californium.LeshanServerBuilder;
import org.eclipse.leshan.server.californium.bootstrap.LeshanBootstrapServer;
import org.eclipse.leshan.server.californium.bootstrap.LeshanBootstrapServerBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.thingsboard.server.transport.lwm2m.bootstrap.secure.LwM2MBootstrapSecurityStore;
import org.thingsboard.server.transport.lwm2m.bootstrap.secure.LwM2MInMemoryBootstrapConfigStore;
import org.thingsboard.server.transport.lwm2m.bootstrap.secure.LwM2MSetSecurityStoreBootstrap;
import org.thingsboard.server.transport.lwm2m.server.LwM2MTransportContextServer;
import java.io.File;
import java.net.URISyntaxException;
import java.util.List;

@Slf4j
@ComponentScan("org.thingsboard.server.transport.lwm2m.server")
@ComponentScan("org.thingsboard.server.transport.lwm2m.bootstrap")
@Configuration("LwM2MTransportBootstrapServerConfiguration")
@ConditionalOnExpression("'${service.type:null}'=='tb-transport' || ('${service.type:null}'=='monolith' && '${transport.lwm2m.enabled}'=='true'  && '${transport.lwm2m.bootstrap.enable}'=='true')")
public class LwM2MTransportBootstrapServerConfiguration {

    @Autowired
    private LwM2MTransportContextBootstrap contextBs;

    @Autowired
    private LwM2MTransportContextServer contextS;

    @Autowired
    private LwM2MBootstrapSecurityStore lwM2MBootstrapSecurityStore;

    @Autowired
    private LwM2MInMemoryBootstrapConfigStore lwM2MInMemoryBootstrapConfigStore;

    @Bean
    public LeshanBootstrapServer getLeshanBootstrapServer() throws URISyntaxException {
            log.info("Prepare and start BootstrapServer... PostConstruct");
        LeshanBootstrapServerBuilder builder = new LeshanBootstrapServerBuilder();
        builder.setLocalAddress(contextBs.getBootstrapHost(), contextBs.getBootstrapPort());
        builder.setLocalSecureAddress(contextBs.getBootstrapSecureHost(), contextBs.getBootstrapSecurePort());

        /**  ConfigStore */
        builder.setConfigStore(lwM2MInMemoryBootstrapConfigStore);

        /** SecurityStore */
        builder.setSecurityStore(lwM2MBootstrapSecurityStore);

        /** Create Models */
        List<ObjectModel> models = ObjectLoader.loadDefault();
        if (contextS.getModelFolderPath() != null) {
            models.addAll(ObjectLoader.loadObjectsFromDir(new File(contextS.getModelFolderPath())));
        }
        builder.setModel(new StaticModel(models));

        /** Create and Set DTLS Config */
        DtlsConnectorConfig.Builder dtlsConfig = new DtlsConnectorConfig.Builder();
        dtlsConfig.setRecommendedCipherSuitesOnly(contextS.isSupportDeprecatedCiphersEnable());
        builder.setDtlsConfig(dtlsConfig);

        /**  Create credentials */
        new LwM2MSetSecurityStoreBootstrap(builder, contextBs, contextS);

        /** Create CoAP Config */
        NetworkConfig coapConfig;
        File configFile = new File(NetworkConfig.DEFAULT_FILE_NAME);
        if (configFile.isFile()) {
            coapConfig = new NetworkConfig();
            coapConfig.load(configFile);
        } else {
            coapConfig = LeshanServerBuilder.createDefaultNetworkConfig();
            coapConfig.store(configFile);
        }
        builder.setCoapConfig(coapConfig);

        /** Create BootstrapServer */
        return builder.build();
    }
}
