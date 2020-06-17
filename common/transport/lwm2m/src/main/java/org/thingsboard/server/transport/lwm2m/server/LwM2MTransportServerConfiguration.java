/**
 * Copyright © 2016-2020 The Thingsboard Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.thingsboard.server.transport.lwm2m.server;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.californium.core.network.config.NetworkConfig;
import org.eclipse.californium.scandium.config.DtlsConnectorConfig;
import org.eclipse.leshan.core.model.ObjectLoader;
import org.eclipse.leshan.core.model.ObjectModel;
import org.eclipse.leshan.core.node.codec.DefaultLwM2mNodeDecoder;
import org.eclipse.leshan.core.node.codec.DefaultLwM2mNodeEncoder;
import org.eclipse.leshan.core.node.codec.LwM2mNodeDecoder;
import org.eclipse.leshan.server.californium.LeshanServer;
import org.eclipse.leshan.server.californium.LeshanServerBuilder;
import org.eclipse.leshan.server.model.LwM2mModelProvider;
import org.eclipse.leshan.server.model.VersionedModelProvider;
import org.eclipse.leshan.server.redis.RedisRegistrationStore;
import org.eclipse.leshan.server.redis.RedisSecurityStore;
import org.eclipse.leshan.server.security.DefaultAuthorizer;
import org.eclipse.leshan.server.security.EditableSecurityStore;
import org.eclipse.leshan.server.security.SecurityChecker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.thingsboard.server.transport.lwm2m.server.secure.LwM2MSecurityMode;
import org.thingsboard.server.transport.lwm2m.server.secure.LwM2mInMemorySecurityStore;
import org.thingsboard.server.transport.lwm2m.server.secure.LwM2mRPkCredentials;
import org.thingsboard.server.transport.lwm2m.utils.LwM2mValueConverterImpl;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.util.Pool;

import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;

import java.io.*;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;

import static org.thingsboard.server.transport.lwm2m.server.secure.LwM2MSecurityMode.X509;
import static org.thingsboard.server.transport.lwm2m.server.secure.LwM2MSecurityMode.REDIS;
import static org.thingsboard.server.transport.lwm2m.server.secure.LwM2MSecurityMode.DEFAULT_MODE;

import static org.thingsboard.server.transport.lwm2m.server.LwM2MTransportHandler.*;


@Slf4j
@ComponentScan("org.thingsboard.server.transport.lwm2m.server")
@Configuration("LwM2MTransportServerConfiguration")
@ConditionalOnExpression("'${service.type:null}'=='tb-transport' || ('${service.type:null}'=='monolith' && '${transport.lwm2m.enabled}'=='true')")
public class LwM2MTransportServerConfiguration {

    @Autowired
    private LwM2MTransportCtx context;

    @Autowired
    private LwM2mInMemorySecurityStore lwM2mInMemorySecurityStore;

    @Bean
    public LeshanServer getLeshanServer() throws URISyntaxException {
        log.info("Starting LwM2M transport... PostConstruct");
        LeshanServerBuilder builder = new LeshanServerBuilder();
        builder.setLocalAddress(context.getServerHost(), context.getServerPort());
        builder.setLocalSecureAddress(context.getServerSecureHost(), context.getServerSecurePort());
        builder.setEncoder(new DefaultLwM2mNodeEncoder());
        LwM2mNodeDecoder decoder = new DefaultLwM2mNodeDecoder();
        builder.setDecoder(decoder);
        builder.setEncoder(new DefaultLwM2mNodeEncoder(new LwM2mValueConverterImpl()));
        /**
         * Create CoAP Config
         */
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

        /**
         *  Define model provider
         */
        List<ObjectModel> models = ObjectLoader.loadDefault();
        List<ObjectModel> listModels = ObjectLoader.loadDdfResources(MODEL_DEFAULT_RESOURCE_PATH, modelPaths);
        models.addAll(listModels);
        if (context.getModelFolderPath() != null) {
            models.addAll(ObjectLoader.loadObjectsFromDir(new File(context.getModelFolderPath())));
        }
        LwM2mModelProvider modelProvider = new VersionedModelProvider(models);
        builder.setObjectModelProvider(modelProvider);

        /**
         * Create DTLS Config
         * There can be only one DTLS security mode
         *
         */
        int securityMode =
                !context.getRedisUrl().isEmpty() ? REDIS.code :
                        !context.getDtlsMode().isEmpty() ? Integer.parseInt(context.getDtlsMode()) :
                                DEFAULT_MODE.code;
        DtlsConnectorConfig.Builder dtlsConfig = new DtlsConnectorConfig.Builder();
        dtlsConfig.setRecommendedCipherSuitesOnly(context.isSupportDeprecatedCiphersEnable());
        LwM2mRPkCredentials lwM2mRPkCredentials = new LwM2mRPkCredentials(context.getServerPublicX(), context.getServerPublicY(), context.getServerPrivateS());
        PublicKey publicKey = lwM2mRPkCredentials.getServerPublicKey();
        PrivateKey privateKey = lwM2mRPkCredentials.getServerPrivateKey();
        switch (LwM2MSecurityMode.fromSecurityMode(securityMode)) {
            /** Use PSK only */
            case PSK:
                if (privateKey != null) {
                    builder.setPrivateKey(privateKey);
                    builder.setPublicKey(null);
                }
                break;
            /** Use RPK only */
            case RPK:
                if (publicKey != null) {
                    builder.setPublicKey(publicKey);
                    builder.setPrivateKey(privateKey);
                }
                break;
            /** Use x509 only */
            case X509:
                setServerWithX509Cert(builder);
                break;
            /** No security */
            case NO_SEC:
                builder.setTrustedCertificates(new X509Certificate[0]);
                break;
            /** Use x509 with EST */
            case X509_EST:
                // TODO support sentinel pool and make pool configurable
                break;
            default:
                // code block
        }

        /** Set DTLS Config */
        builder.setDtlsConfig(dtlsConfig);

        /** Set securityStore with new registrationStore */
        EditableSecurityStore securityStore = null;

//        if (jedis == null) {
        if (securityMode < REDIS.code) {
            securityStore = lwM2mInMemorySecurityStore;
            if (securityMode == X509.code) {
                builder.setAuthorizer(new DefaultAuthorizer(securityStore, new SecurityChecker() {
                    @Override
                    protected boolean matchX509Identity(String endpoint, String receivedX509CommonName,
                                                        String expectedX509CommonName) {
                        return endpoint.startsWith(expectedX509CommonName);
                    }
                }));
            }
        } else if (securityMode == REDIS.code) {
            /**
             * Use  Redis Store
             * Connect to redis if needed
             */
            Pool<Jedis> jedis = new JedisPool(new URI(context.getRedisUrl()));
            securityStore = new RedisSecurityStore(jedis);
            builder.setRegistrationStore(new RedisRegistrationStore(jedis));
        }
        builder.setSecurityStore(securityStore);

        /** Use a magic converter to support bad type send by the UI. */
        builder.setEncoder(new DefaultLwM2mNodeEncoder(new LwM2mValueConverterImpl()));

        /** Create LWM2M server */
        return builder.build();
    }

    private void setServerWithX509Cert(LeshanServerBuilder builder) {
        try {
            KeyStore keyStoreServer = getKeyStoreServer(builder);
            X509Certificate rootCAX509Cert = (X509Certificate) keyStoreServer.getCertificate(context.getRootAlias());
            Certificate[] trustedCertificates = new Certificate[1];
            trustedCertificates[0] = rootCAX509Cert;
            builder.setTrustedCertificates(trustedCertificates);
        } catch (KeyStoreException ex) {
            log.error("[{}] Unable to load X509 files server", ex.getMessage());
        }
    }

    private KeyStore getKeyStoreServer(LeshanServerBuilder builder) {
        KeyStore keyStoreServer = null;
        try (InputStream inServer = ClassLoader.getSystemResourceAsStream(context.getKeyStorePathServer())) {
            keyStoreServer = KeyStore.getInstance(context.getKeyStoreType());
            keyStoreServer.load(inServer, context.getKeyStorePasswordServer() == null ? null : context.getKeyStorePasswordServer().toCharArray());
            X509Certificate serverCertificate = (X509Certificate) keyStoreServer.getCertificate(context.getServerAlias());
            PrivateKey privateKey = (PrivateKey) keyStoreServer.getKey(context.getServerAlias(), context.getKeyStorePasswordServer() == null ? null : context.getKeyStorePasswordServer().toCharArray());
            builder.setPrivateKey(privateKey);
            builder.setCertificateChain(new X509Certificate[]{serverCertificate});
        } catch (Exception ex) {
            log.error("[{}] Unable to load KeyStore  files server", ex.getMessage());
        }
        return keyStoreServer;
    }
}
