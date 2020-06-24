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
package org.thingsboard.server.transport.lwm2m.secure;

import com.google.gson.JsonObject;
import lombok.Builder;
import lombok.Data;
import org.eclipse.leshan.server.bootstrap.BootstrapConfig;
import org.eclipse.leshan.server.security.SecurityInfo;
import org.thingsboard.server.transport.lwm2m.bootstrap.secure.LwM2MBootstrapConfig;

import static org.thingsboard.server.transport.lwm2m.secure.LwM2MSecurityMode.DEFAULT_MODE;

@Data
public class ReadResultSecurityStore {
    private SecurityInfo securityInfo;
    @Builder.Default
    private int securityMode = DEFAULT_MODE.code;
    /** bootstrap */
    JsonObject bootstrapJson;
    /** serverBs */
    private String hostServerBs;
    private Integer portServerBs;
    @Builder.Default
    private int securityModeServerBs = DEFAULT_MODE.code;
    /** PSK/RPK/x509/NoSec */
    private String clientPublicKeyOrIdServerBs;
    private String serverPublicServerBs;
    private String clientSecretKeyServerBs;
    /** bootstrapBs */
    private String hostBootstrapBs;
    private Integer portBootstrapBs;
    @Builder.Default
    private int securityModeBootstrapBs = DEFAULT_MODE.code;
    /** PSK/RPK/x509/NoSec */
    private String clientPublicKeyOrIdBootstrapBs;
    private String serverPublicBootstrapBs;
    private String clientSecretKeyBootstrapBs;


    public BootstrapConfig getLwM2MBootstrapConfig() {
        String uri0 = "coaps://" + this.hostBootstrapBs + ":" + Integer.toString(this.portBootstrapBs);
        String uri1 = "coaps://" + this.hostServerBs + ":" + Integer.toString(this.portServerBs);
        return new LwM2MBootstrapConfig(uri0, securityModeBootstrapBs, clientPublicKeyOrIdBootstrapBs, serverPublicBootstrapBs, clientSecretKeyBootstrapBs,
                                        uri1, securityModeServerBs, clientPublicKeyOrIdServerBs, serverPublicServerBs, clientSecretKeyServerBs);
    }



}
