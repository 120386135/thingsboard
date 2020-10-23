///
/// Copyright © 2016-2020 The Thingsboard Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import {
  DeviceProfileTransportConfiguration,
  DeviceTransportType
} from '@shared/models/device.models';
import { MatTabChangeEvent } from "@angular/material/tabs";
import {
  Component,
  forwardRef, Inject,
  Input,
  OnInit
} from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@app/core/core.state';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import {
  ATTR,
  OBSERVE,
  OBSERVE_ATTR,
  TELEMETRY,
  ObjectLwM2M, getDefaultProfileConfig
} from "./profile-config.models";
import { DeviceProfileService } from "../../../../../../core/http/device-profile.service";
import { deepClone } from "../../../../../../core/utils";
import { WINDOW } from "../../../../../../core/services/window.service";

@Component({
  selector: 'tb-profile-lwm2m-device-transport-configuration',
  templateUrl: './lwm2m-device-profile-transport-configuration.component.html',
  styleUrls: [],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Lwm2mDeviceProfileTransportConfigurationComponent),
    multi: true
  }]
})
export class Lwm2mDeviceProfileTransportConfigurationComponent implements ControlValueAccessor, OnInit, Validators {

  lwm2mDeviceProfileTransportConfFormGroup: FormGroup;
  observeAttr: string;
  observe: string;
  attribute: string;
  telemetry: string;
  bootstrapServers: string;
  bootstrapServer: string;
  lwm2mServer: string;
  private configurationValue: {};
  private requiredValue: boolean;
  private tabIndexPrevious = 0 as number;

  get required(): boolean {
    return this.requiredValue;
  }

  @Input()
  set required(value: boolean) {
    this.requiredValue = coerceBooleanProperty(value);
  }

  @Input()
  disabled: boolean;

  private propagateChange = (v: any) => {
  };

  constructor(private store: Store<AppState>,
              private fb: FormBuilder,
              private deviceProfileService: DeviceProfileService,
              @Inject(WINDOW) private window: Window) {
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  ngOnInit() {
    this.initConstants();
    this.lwm2mDeviceProfileTransportConfFormGroup = this.fb.group({
      objectIds: [{}, Validators.required],
      observeAttrTelemetry: [{'clientLwM2M': [] as ObjectLwM2M []}, Validators.required],
      // observeAttrTelemetry: [this.fb.group({clientLwM2M: this.fb.array([] as ObjectLwM2M [])}), Validators.required],
      shortId: [null, Validators.required],
      lifetime: [null, Validators.required],
      defaultMinPeriod: [null, Validators.required],
      notifIfDisabled: [true, []],
      binding: ["U", Validators.required],
      bootstrapServer: [null, Validators.required],
      lwm2mServer: [null, Validators.required],
      configurationJson: [null, Validators.required],
    });
    this.lwm2mDeviceProfileTransportConfFormGroup.valueChanges.subscribe(() => {
      if (this.disabled !== undefined && !this.disabled) {
        this.updateModel();
      }
    });
  }

  initConstants(): void {
    this.observeAttr = OBSERVE_ATTR;
    this.observe = OBSERVE;
    this.attribute = ATTR;
    this.telemetry = TELEMETRY;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.disabled) {
      this.lwm2mDeviceProfileTransportConfFormGroup.disable({emitEvent: false});
    } else {
      this.lwm2mDeviceProfileTransportConfFormGroup.enable({emitEvent: false});
    }
  }

  writeValue(value: any | null): void {
    value = (Object.keys(value).length === 0) ? getDefaultProfileConfig() : value;
     this.lwm2mDeviceProfileTransportConfFormGroup.patchValue({
        configurationJson: value
      },
      {emitEvent: false});
    this.configurationValue = this.lwm2mDeviceProfileTransportConfFormGroup.getRawValue().configurationJson;
    this.initWriteValue();
  }

  private initWriteValue(): void {
    let modelValue = {"objectIds": null, "objectsList": []};
    modelValue.objectIds = this.getObjectsFromJsonAllConfig();
    if (modelValue.objectIds !== null) {
      this.deviceProfileService.getLwm2mObjects(modelValue.objectIds).subscribe(
        (objectsList) => {
          modelValue.objectsList = objectsList;
          this.updateWriteValue(modelValue);
        }
      );
    }
    else {
      this.updateWriteValue(modelValue);
    }
  }

  private updateWriteValue(value: any): void {
    let objectsList = deepClone(value.objectsList);
    this.lwm2mDeviceProfileTransportConfFormGroup.patchValue({
        objectIds: value,
        observeAttrTelemetry: {clientLwM2M: this.getObserveAttrTelemetryObjects(objectsList)},
        shortId: this.configurationValue['bootstrap'].servers.shortId,
        lifetime: this.configurationValue['bootstrap'].servers.lifetime,
        defaultMinPeriod: this.configurationValue['bootstrap'].servers.defaultMinPeriod,
        notifIfDisabled: this.configurationValue['bootstrap'].servers.notifIfDisabled,
        binding: this.configurationValue['bootstrap'].servers.binding,
        bootstrapServer: this.configurationValue['bootstrap'].bootstrapServer,
        lwm2mServer: this.configurationValue['bootstrap'].lwm2mServer
      },
      {emitEvent: false});
  }

  // private initObserveAttrTelemetryFormGroup(listObject: ObjectLwM2M[]): {}{
  //   return {clientLwM2M: deepClone(listObject)};
  // }

  private updateModel() {
    let configuration: DeviceProfileTransportConfiguration = null;
    if (this.lwm2mDeviceProfileTransportConfFormGroup.valid) {
      this.upDateValueToJson();
      configuration = this.lwm2mDeviceProfileTransportConfFormGroup.getRawValue().configurationJson;
      configuration.type = DeviceTransportType.LWM2M;
    }
    this.propagateChange(configuration);
  }

  private updateObserveAttrTelemetryObjectFormGroup(objectsList: ObjectLwM2M[]) {
    this.lwm2mDeviceProfileTransportConfFormGroup.patchValue({
        observeAttrTelemetry: {clientLwM2M: this.getObserveAttrTelemetryObjects(objectsList)}
      },
      {emitEvent: false});
    this.lwm2mDeviceProfileTransportConfFormGroup.get("observeAttrTelemetry").markAsPristine({
      onlySelf: true
    });
  }

  upDateValueToJson(): void {
    this.upDateValueToJsonTab_0();
    this.upDateValueToJsonTab_1();
  }

  upDateValueToJsonTab_0(): void {
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get("observeAttrTelemetry").pristine) {
      this.upDateObserveAttrFromGroupToJson(this.lwm2mDeviceProfileTransportConfFormGroup.get("observeAttrTelemetry").value['clientLwM2M']);
      this.lwm2mDeviceProfileTransportConfFormGroup.get("observeAttrTelemetry").markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
  }

  upDateValueToJsonTab_1(): void {
    this.upDateValueServersToJson();
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('bootstrapServer').pristine) {
      this.configurationValue['bootstrap'].bootstrapServer = this.lwm2mDeviceProfileTransportConfFormGroup.get('bootstrapServer').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('bootstrapServer').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('lwm2mServer').pristine) {
      this.configurationValue['bootstrap'].lwm2mServer = this.lwm2mDeviceProfileTransportConfFormGroup.get('lwm2mServer').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('lwm2mServer').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }


  }

  upDateValueServersToJson(): void {
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('shortId').pristine) {
      this.configurationValue['bootstrap'].servers.shortId = this.lwm2mDeviceProfileTransportConfFormGroup.get('shortId').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('shortId').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('lifetime').pristine) {
      this.configurationValue['bootstrap'].servers.lifetime = this.lwm2mDeviceProfileTransportConfFormGroup.get('lifetime').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('lifetime').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('defaultMinPeriod').pristine) {
      this.configurationValue['bootstrap'].servers.defaultMinPeriod = this.lwm2mDeviceProfileTransportConfFormGroup.get('defaultMinPeriod').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('defaultMinPeriod').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('notifIfDisabled').pristine) {
      this.configurationValue['bootstrap'].servers.notifIfDisabled = this.lwm2mDeviceProfileTransportConfFormGroup.get('notifIfDisabled').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('notifIfDisabled').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
    if (!this.lwm2mDeviceProfileTransportConfFormGroup.get('binding').pristine) {
      this.configurationValue['bootstrap'].servers.binding = this.lwm2mDeviceProfileTransportConfFormGroup.get('binding').value;
      this.lwm2mDeviceProfileTransportConfFormGroup.get('binding').markAsPristine({
        onlySelf: true
      });
      this.upDateJsonAllConfig();
    }
  }

  getObserveAttrTelemetryObjects(listObject: ObjectLwM2M[]): ObjectLwM2M [] {
    let clientObserveAttr = deepClone(listObject);
    if (this.configurationValue[this.observeAttr]) {
      let observeArray = this.configurationValue[this.observeAttr][this.observe] as Array<string>;
      let attributeArray = this.configurationValue[this.observeAttr][this.attribute] as Array<string>;
      let telemetryArray = this.configurationValue[this.observeAttr][this.telemetry] as Array<string>;
      if (observeArray) clientObserveAttr = this.updateObserveAttrTelemetryObjects(observeArray, clientObserveAttr, "observe");
      if (attributeArray) clientObserveAttr = this.updateObserveAttrTelemetryObjects(attributeArray, clientObserveAttr, "attribute");
      if (telemetryArray) clientObserveAttr = this.updateObserveAttrTelemetryObjects(telemetryArray, clientObserveAttr, "telemetry");
    }
    return clientObserveAttr;
  }

  updateObserveAttrTelemetryObjects(isParameter: Array<string>, clientObserveAttr: ObjectLwM2M[], nameParameter: string): ObjectLwM2M [] {
    isParameter.forEach(attr => {
      let pathParameter = Array.from(attr.substring(1).split('/'), Number);
      clientObserveAttr.forEach(obj => {
        if (obj.id === pathParameter[0]) {
          obj.instances.forEach(inst => {
            if (inst.id === pathParameter[1]) {
              inst.resources.forEach(res => {
                if (res.id === pathParameter[2]) res[nameParameter] = true;
              })
            }
          })
        }
      });
    });
    return clientObserveAttr;
  }

  upDateObserveAttrFromGroupToJson(val: ObjectLwM2M []): void {
    let observeArray = [] as Array<string>;
    let attributeArray = [] as Array<string>;
    let telemetryArray = [] as Array<string>;
    let observeJson = JSON.parse(JSON.stringify(val));
    let pathObj;
    let pathInst;
    let pathRes
    observeJson.forEach(obj => {
      Object.entries(obj).forEach(([key, value]) => {
        if (key === 'id') {
          pathObj = value;
        }
        if (key === 'instances') {
          let instancesJson = JSON.parse(JSON.stringify(value)) as [];
          if (instancesJson.length > 0) {
            instancesJson.forEach(instance => {
              Object.entries(instance).forEach(([key, value]) => {
                if (key === 'id') {
                  pathInst = value;
                }
                let pathInstObserve;
                if (key === 'observe' && value) {
                  pathInstObserve = '/' + pathObj + '/' + pathInst;
                  observeArray.push(pathInstObserve)
                }
                if (key === 'resources') {
                  let resourcesJson = JSON.parse(JSON.stringify(value)) as [];
                  if (resourcesJson.length > 0) {
                    resourcesJson.forEach(res => {
                      Object.entries(res).forEach(([key, value]) => {
                        if (key === 'id') {
                          // pathRes = value
                          pathRes = '/' + pathObj + '/' + pathInst + '/' + value;
                        } else if (key === 'observe' && value) {
                          observeArray.push(pathRes)
                        } else if (key === 'attribute' && value) {
                          attributeArray.push(pathRes)
                        } else if (key === 'telemetry' && value) {
                          telemetryArray.push(pathRes)
                        }
                      });
                    });
                  }
                }
              });
            });
          }
        }
      });
    });
    if (this.configurationValue[this.observeAttr] === undefined) {
      this.configurationValue[this.observeAttr] = {
        [this.observe]: observeArray,
        [this.attribute]: attributeArray,
        [this.telemetry]: telemetryArray
      };
    } else {
      this.configurationValue[this.observeAttr][this.observe] = observeArray;
      this.configurationValue[this.observeAttr][this.attribute] = attributeArray;
      this.configurationValue[this.observeAttr][this.telemetry] = telemetryArray;
    }
  }

  getObjectsFromJsonAllConfig(): number [] {
    let objectsIds = new Set<number>();
    if (this.configurationValue[this.observeAttr]) {
      if (this.configurationValue[this.observeAttr][this.observe]) {
        this.configurationValue[this.observeAttr][this.observe].forEach(obj => {
          objectsIds.add(+obj.split("/")[1]);
        });
      }
      if (this.configurationValue[this.observeAttr][this.attribute]) {
        this.configurationValue[this.observeAttr][this.attribute].forEach(obj => {
          objectsIds.add(+obj.split("/")[1]);
        });
      }
      if (this.configurationValue[this.observeAttr][this.telemetry]) {
        this.configurationValue[this.observeAttr][this.telemetry].forEach(obj => {
          objectsIds.add(+obj.split("/")[1]);
        });
      }
    }
    return (objectsIds.size > 0) ? Array.from(objectsIds) : null;
  }

  upDateJsonAllConfig(): void {
    this.lwm2mDeviceProfileTransportConfFormGroup.patchValue({
      configurationJson: this.configurationValue
    }, {emitEvent: false});
    this.lwm2mDeviceProfileTransportConfFormGroup.markAsPristine({
      onlySelf: true
    });
  }

  addList(value: ObjectLwM2M[]): void {
    this.updateObserveAttrTelemetryObjectFormGroup(deepClone(value));
  }

  removeList(value: ObjectLwM2M): void {
    let objectOld = deepClone(this.lwm2mDeviceProfileTransportConfFormGroup.get("observeAttrTelemetry").value.clientLwM2M);
    const isIdIndex = (element) => element.id === value.id;
    let index = objectOld.findIndex(isIdIndex);
    if (index >= 0) {
      objectOld.splice(index, 1);
    }
    this.updateObserveAttrTelemetryObjectFormGroup(objectOld);
    this.removeObserveAttrTelemetryFromJson(this.observe, value.id);
    this.removeObserveAttrTelemetryFromJson(this.telemetry, value.id);
    this.removeObserveAttrTelemetryFromJson(this.attribute, value.id);
    this.upDateJsonAllConfig();
  }

  removeObserveAttrTelemetryFromJson(observeAttrTel: string, id: number): void {
    let isIdIndex = (element) => Array.from(element.substring(1).split('/'), Number)[0] === id;
    let index = this.configurationValue[this.observeAttr][observeAttrTel].findIndex(isIdIndex);
    while (index >= 0) {
      this.configurationValue[this.observeAttr][observeAttrTel].splice(index, 1);
      index = this.configurationValue[this.observeAttr][observeAttrTel].findIndex(isIdIndex);
    }
  }
}
