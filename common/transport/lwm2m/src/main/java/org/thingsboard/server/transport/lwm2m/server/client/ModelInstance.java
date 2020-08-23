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
package org.thingsboard.server.transport.lwm2m.server.client;


import lombok.Getter;
import lombok.Setter;
import org.eclipse.leshan.core.node.LwM2mObjectInstance;
import org.eclipse.leshan.core.node.LwM2mResource;

import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;


public class ModelInstance extends LwM2mObjectInstance {
    /**
     * Map<idResource, boolean[observe, attr, telemetry]>
     */
    @Getter
    @Setter
    private Map<Integer, boolean[]> paramResources;

    public ModelInstance(Collection<LwM2mResource> resources, Map<Integer, boolean[]> paramResources) {
        super(resources);
        this.paramResources = (paramResources != null && paramResources.size()>0) ? paramResources : new ConcurrentHashMap<Integer, boolean[]>();
    }
}
