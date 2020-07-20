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


import {Component, Inject, OnInit} from '@angular/core';
import {DialogComponent} from '@shared/components/dialog.component';
import {Store} from '@ngrx/store';
import {AppState} from '@core/core.state';
import {Router} from '@angular/router';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ControlValueAccessor, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';
import {
  SECURITY_CONFIG_MODE_NAMES,
  SECURITY_CONFIG_MODE,
  SecurityConfigModels,
  ClientSecurityConfigPSK,
  ClientSecurityConfigRPK,
  JSON_OBSERVE,
  ServerSecurityConfig,
  OBSERVE,
  ObjectLwM2M,
  JSON_ALL_CONFIG,
  KEY_IDENT_REGEXP_PSK,
  KEY_PUBLIC_REGEXP_PSK,
  DEFAULT_END_POINT,
  DeviceCredentialsDialogLwm2mData,
  BOOTSTRAP_SERVER,
  BOOTSTRAP_SERVERS,
  LWM2M_SERVER,
  DEFAULT_ID_SERVER,
  DEFAULT_LIFE_TIME,
  DEFAULT_DEFAULT_MIN_PERIOD,
  DEFAULT_BINDING,
  ClientSecurityConfigX509,
  ClientSecurityConfigNO_SEC,
  getDefaultClientSecurityConfigType,

  DEFAULT_CLIENT_HOLD_OFF_TIME,
  LEN_MAX_PSK,
  LEN_MAX_PUBLIC_KEY_RPK,
  BOOTSTRAP_PUBLIC_KEY_RPK,
  LWM2M_SERVER_PUBLIC_KEY_RPK,
  DEFAULT_PORT_BOOTSTRAP,
  DEFAULT_PORT_SERVER,
  DEFAULT_PORT_BOOTSTRAP_NO_SEC,
  DEFAULT_PORT_SERVER_NO_SEC, BOOTSTRAP_PUBLIC_KEY_X509, LWM2M_SERVER_PUBLIC_KEY_X509, getDefaultClientObserve,
} from "./security-config.models";
import {WINDOW} from "@core/services/window.service";


@Component({
  selector: 'tb-security-config-lwm2m',
  templateUrl: './security-config.component.html',
  styleUrls: []
})

export class SecurityConfigComponent extends DialogComponent<SecurityConfigComponent, object> implements OnInit {

  lwm2mConfigFormGroup: FormGroup;
  title: string;
  submitted = false;
  securityConfigLwM2MType = SECURITY_CONFIG_MODE;
  securityConfigLwM2MTypes = Object.keys(SECURITY_CONFIG_MODE);
  credentialTypeLwM2MNamesMap = SECURITY_CONFIG_MODE_NAMES;
  formControlNameJsonAllConfig = JSON_ALL_CONFIG;
  jsonAllConfig: SecurityConfigModels;
  bootstrapServers: string;
  bootstrapServer: string;
  lwm2mServer: string;
  formControlNameJsonObserve: string;
  observeData: ObjectLwM2M[];
  jsonObserveData: {};
  observe: string;
  bootstrapFormGroup: FormGroup;
  lwm2mServerFormGroup: FormGroup;
  observeFormGroup: FormGroup;
  lenMaxKeyClient = LEN_MAX_PSK;
  bsPublikKeyRPK: string
  lwM2mPublikKeyRPK: string
  bsPublikKeyX509: string
  lwM2mPublikKeyX509: string

  constructor(protected store: Store<AppState>,
              protected router: Router,
              @Inject(MAT_DIALOG_DATA) public data: DeviceCredentialsDialogLwm2mData,
              public dialogRef: MatDialogRef<SecurityConfigComponent, object>,
              public fb: FormBuilder,
              private translate: TranslateService,
              @Inject(WINDOW) private window: Window) {
    super(store, router, dialogRef);
  }

  ngOnInit(): void {
    this.getFromYml();
    this.jsonAllConfig = JSON.parse(JSON.stringify(this.data.jsonAllConfig)) as SecurityConfigModels;
    this.initConstants();
    this.lwm2mConfigFormGroup = this.initLwm2mConfigFormGroup();
    this.title = this.translate.instant('device.lwm2m-security-info') + ": " + this.data.endPoint
    this.lwm2mConfigFormGroup.get('clientCertificate').disable();
    this.initChildesFormGroup();
    this.initClientSecurityConfig(this.lwm2mConfigFormGroup.get('jsonAllConfig').value);
    this.registerDisableOnLoadFormControl(this.lwm2mConfigFormGroup.get('securityConfigClientMode'));
    this.upDateValueFromForm();
  }

  initConstants(): void {
    this.bootstrapServers = BOOTSTRAP_SERVERS;
    this.bootstrapServer = BOOTSTRAP_SERVER;
    this.lwm2mServer = LWM2M_SERVER;
    this.observe = OBSERVE;
    this.formControlNameJsonObserve = JSON_OBSERVE;
  }

  initChildesFormGroup(): void {
    this.bootstrapFormGroup = this.lwm2mConfigFormGroup.get('bootstrapFormGroup') as FormGroup;
    this.lwm2mServerFormGroup = this.lwm2mConfigFormGroup.get('lwm2mServerFormGroup') as FormGroup;
    this.observeFormGroup = this.lwm2mConfigFormGroup.get('observeFormGroup') as FormGroup;
  }

  initClientSecurityConfig(jsonAllConfig: SecurityConfigModels): void {
    switch (jsonAllConfig.client.securityConfigClientMode.toString()) {
      case SECURITY_CONFIG_MODE.NO_SEC.toString():
        break;
      case SECURITY_CONFIG_MODE.PSK.toString():
        const clientSecurityConfigPSK = jsonAllConfig.client as ClientSecurityConfigPSK;
        this.lwm2mConfigFormGroup.patchValue({
          identityPSK: clientSecurityConfigPSK.identity,
          clientKey: clientSecurityConfigPSK.key,
        }, {emitEvent: true});
        break;
      case SECURITY_CONFIG_MODE.RPK.toString():
        const clientSecurityConfigRPK = jsonAllConfig.client as ClientSecurityConfigRPK;
        this.lwm2mConfigFormGroup.patchValue({
          clientKey: clientSecurityConfigRPK.key,
        }, {emitEvent: true});
        break;
      case SECURITY_CONFIG_MODE.X509.toString():
        const clientSecurityConfigX509 = jsonAllConfig.client as ClientSecurityConfigX509;
        this.lwm2mConfigFormGroup.patchValue({
          X509: clientSecurityConfigX509.x509,
        }, {emitEvent: true});
        break;
    }
    this.securityConfigClientUpdateValidators(this.lwm2mConfigFormGroup.get('securityConfigClientMode').value);
  }

  securityConfigClientModeChanged(mode: SECURITY_CONFIG_MODE): void {
    switch (mode) {
      case SECURITY_CONFIG_MODE.NO_SEC:
        let clientSecurityConfigNO_SEC = getDefaultClientSecurityConfigType(mode) as ClientSecurityConfigNO_SEC;
        this.jsonAllConfig.client = clientSecurityConfigNO_SEC;
        this.lwm2mConfigFormGroup.patchValue({
          jsonAllConfig: this.jsonAllConfig,
          clientCertificate: false
        }, {emitEvent: true});
        break;
      case SECURITY_CONFIG_MODE.PSK:
        let clientSecurityConfigPSK = getDefaultClientSecurityConfigType(mode, this.lwm2mConfigFormGroup.get('endPoint').value) as ClientSecurityConfigPSK;
        clientSecurityConfigPSK.identity = this.data.endPoint;
        clientSecurityConfigPSK.key = this.lwm2mConfigFormGroup.get('clientKey').value;
        this.jsonAllConfig.client = clientSecurityConfigPSK;
        this.lwm2mConfigFormGroup.patchValue({
          identityPSK: clientSecurityConfigPSK.identity,
          clientCertificate: false
        }, {emitEvent: true});
        break;
      case SECURITY_CONFIG_MODE.RPK:
        let clientSecurityConfigRPK = getDefaultClientSecurityConfigType(mode) as ClientSecurityConfigRPK;
        clientSecurityConfigRPK.key = this.lwm2mConfigFormGroup.get('clientKey').value;
        this.jsonAllConfig.client = clientSecurityConfigRPK;
        this.lwm2mConfigFormGroup.patchValue({
          jsonAllConfig: this.jsonAllConfig,
          clientCertificate: false
        }, {emitEvent: true})
        break;
      case SECURITY_CONFIG_MODE.X509:
        let clientSecurityConfigX509 = getDefaultClientSecurityConfigType(mode) as ClientSecurityConfigX509;
        this.jsonAllConfig.client = clientSecurityConfigX509;
        this.lwm2mConfigFormGroup.patchValue({
          jsonAllConfig: this.jsonAllConfig,
          clientCertificate: true
        }, {emitEvent: true})
        break;
    }
    this.updateServerPublicKey(mode);
    this.securityConfigClientUpdateValidators(mode);
  }

  securityConfigClientUpdateValidators(mode: SECURITY_CONFIG_MODE): void {
    switch (mode) {
      case SECURITY_CONFIG_MODE.NO_SEC:
        this.lwm2mConfigFormGroup.get('identityPSK').setValidators([]);
        this.lwm2mConfigFormGroup.get('identityPSK').updateValueAndValidity();
        this.lwm2mConfigFormGroup.get('clientKey').setValidators([]);
        this.lwm2mConfigFormGroup.get('clientKey').updateValueAndValidity();
        break;
      case SECURITY_CONFIG_MODE.PSK:
        this.lenMaxKeyClient = LEN_MAX_PSK;
        this.lwm2mConfigFormGroup.get('identityPSK').setValidators([]);
        this.lwm2mConfigFormGroup.get('identityPSK').updateValueAndValidity();
        this.lwm2mConfigFormGroup.get('clientKey').setValidators([Validators.required, Validators.pattern(KEY_IDENT_REGEXP_PSK)]);
        this.lwm2mConfigFormGroup.get('clientKey').updateValueAndValidity();
        break;
      case SECURITY_CONFIG_MODE.RPK:
        this.lenMaxKeyClient = LEN_MAX_PUBLIC_KEY_RPK;
        this.lwm2mConfigFormGroup.get('identityPSK').setValidators([]);
        this.lwm2mConfigFormGroup.get('identityPSK').updateValueAndValidity();
        this.lwm2mConfigFormGroup.get('clientKey').setValidators([Validators.required, Validators.pattern(KEY_PUBLIC_REGEXP_PSK)]);
        this.lwm2mConfigFormGroup.get('clientKey').updateValueAndValidity();
        break;
      case SECURITY_CONFIG_MODE.X509:
        this.lenMaxKeyClient = LEN_MAX_PUBLIC_KEY_RPK;
        this.lwm2mConfigFormGroup.get('identityPSK').setValidators([]);
        this.lwm2mConfigFormGroup.get('identityPSK').updateValueAndValidity();
        this.lwm2mConfigFormGroup.get('clientKey').setValidators([]);
        this.lwm2mConfigFormGroup.get('clientKey').updateValueAndValidity();
        break;
    }
  }

  updateServerPublicKey(mode: SECURITY_CONFIG_MODE): void {
    this.jsonAllConfig.bootstrap.bootstrapServer.securityMode = mode.toString();
    this.jsonAllConfig.bootstrap.lwm2mServer.securityMode = mode.toString();
    this.jsonAllConfig.bootstrap.bootstrapServer.port = DEFAULT_PORT_BOOTSTRAP;
    this.jsonAllConfig.bootstrap.lwm2mServer.port = DEFAULT_PORT_SERVER;
    switch (mode) {
      case SECURITY_CONFIG_MODE.NO_SEC:
        this.jsonAllConfig.bootstrap.bootstrapServer.port = DEFAULT_PORT_BOOTSTRAP_NO_SEC;
        this.jsonAllConfig.bootstrap.lwm2mServer.securityMode = SECURITY_CONFIG_MODE.NO_SEC.toString();
        this.jsonAllConfig.bootstrap.bootstrapServer.serverPublicKey = '';
        this.jsonAllConfig.bootstrap.lwm2mServer.serverPublicKey = '';
        break;
      case SECURITY_CONFIG_MODE.PSK:
        this.jsonAllConfig.bootstrap.bootstrapServer.serverPublicKey = '';
        this.jsonAllConfig.bootstrap.lwm2mServer.serverPublicKey = '';
        break;
      case SECURITY_CONFIG_MODE.RPK:
        this.jsonAllConfig.bootstrap.bootstrapServer.serverPublicKey = this.bsPublikKeyRPK;
        this.jsonAllConfig.bootstrap.lwm2mServer.serverPublicKey = this.lwM2mPublikKeyRPK;
        break;
      case SECURITY_CONFIG_MODE.X509:
        this.jsonAllConfig.bootstrap.bootstrapServer.serverPublicKey = this.bsPublikKeyX509;
        this.jsonAllConfig.bootstrap.lwm2mServer.serverPublicKey = this.lwM2mPublikKeyX509;
        break;
    }
    this.lwm2mConfigFormGroup.get('bootstrapServer').patchValue(
      this.jsonAllConfig.bootstrap.bootstrapServer, {emitEvent: false});
    this.lwm2mConfigFormGroup.get('lwm2mServer').patchValue(
      this.jsonAllConfig.bootstrap.lwm2mServer, {emitEvent: false});
    this.upDateJsonAllConfig();
  }

  upDateValueFromForm(): void {
    this.lwm2mConfigFormGroup.get('endPoint').valueChanges.subscribe(val => {
      if (!this.lwm2mConfigFormGroup.get('endPoint').pristine && this.lwm2mConfigFormGroup.get('endPoint').valid) {
        this.data.endPoint = this.lwm2mConfigFormGroup.get('endPoint').value;
        // Client mode == PSK
        if (this.lwm2mConfigFormGroup.get('securityConfigClientMode').value === SECURITY_CONFIG_MODE.PSK) {
          this.lwm2mConfigFormGroup.patchValue({
            identityPSK: this.data.endPoint
          }, {emitEvent: false});
        }
        this.updateIdentityPSK();
      }
    })

    // only  Client mode == PSK
    this.lwm2mConfigFormGroup.get('identityPSK').valueChanges.subscribe(val => {
      if (!this.lwm2mConfigFormGroup.get('identityPSK').pristine && this.lwm2mConfigFormGroup.get('identityPSK').valid) {
        this.data.endPoint = this.lwm2mConfigFormGroup.get('identityPSK').value;
        this.lwm2mConfigFormGroup.patchValue({
          endPoint: this.data.endPoint
        }, {emitEvent: false});
        this.updateIdentityPSK();
      }
    })

    // only  Client mode == PSK (len = 64) || RPK (len = 182)
    this.lwm2mConfigFormGroup.get('clientKey').valueChanges.subscribe(val => {
      if (!this.lwm2mConfigFormGroup.get('clientKey').pristine && this.lwm2mConfigFormGroup.get('clientKey').valid) {
        this.updateClientKey();
      }
    })

    this.lwm2mConfigFormGroup.get(JSON_ALL_CONFIG).valueChanges.subscribe(val => {
      if (!this.lwm2mConfigFormGroup.get(JSON_ALL_CONFIG).pristine && this.lwm2mConfigFormGroup.get(JSON_ALL_CONFIG).valid) {
        this.jsonAllConfig = val;
      }
    })

    this.bootstrapFormGroup.valueChanges.subscribe(val => {
      if (!this.bootstrapFormGroup.pristine && this.bootstrapFormGroup.valid) {
        this.jsonAllConfig.bootstrap.bootstrapServer = val;
        this.upDateJsonAllConfig();
      }
    })

    this.lwm2mServerFormGroup.valueChanges.subscribe(val => {
      if (!this.lwm2mServerFormGroup.pristine && this.lwm2mServerFormGroup.valid) {
        this.jsonAllConfig.bootstrap.lwm2mServer = val;
        this.upDateJsonAllConfig();
      }
    })

    this.lwm2mConfigFormGroup.get(JSON_OBSERVE).valueChanges.subscribe(val => {
      if (!this.lwm2mConfigFormGroup.get(JSON_OBSERVE).pristine && this.lwm2mConfigFormGroup.get(JSON_OBSERVE).valid) {
        console.log(JSON_OBSERVE + ': ', val);
      }
    })

    this.observeFormGroup.valueChanges.subscribe(val => {
      if (!this.observeFormGroup.pristine && this.observeFormGroup.valid) {
        this.upDateObserveFromGroup(val);
      }
    })
  }

  updateIdentityPSK(): void {
    this.jsonAllConfig.client["endpoint"] = this.data.endPoint;
    this.jsonAllConfig.client["identity"] = this.data.endPoint;
    if (this.lwm2mConfigFormGroup.get('bootstrapServer').value['securityMode'] === SECURITY_CONFIG_MODE.PSK.toString()) {
      this.lwm2mConfigFormGroup.get('bootstrapServer').patchValue({
        clientPublicKeyOrId: this.data.endPoint
      }, {emitEvent: false});
      this.jsonAllConfig.bootstrap.bootstrapServer.clientPublicKeyOrId = this.data.endPoint
    }
    if (this.lwm2mConfigFormGroup.get('lwm2mServer').value['securityMode'] === SECURITY_CONFIG_MODE.PSK.toString()) {
      this.lwm2mConfigFormGroup.get('lwm2mServer').patchValue({
        clientPublicKeyOrId: this.data.endPoint
      }, {emitEvent: false});
      this.jsonAllConfig.bootstrap.lwm2mServer.clientPublicKeyOrId = this.data.endPoint
    }
    this.upDateJsonAllConfig();
  }

  updateClientKey(): void {
    this.jsonAllConfig.client["key"] = this.lwm2mConfigFormGroup.get('clientKey').value;
    if (this.lwm2mConfigFormGroup.get('bootstrapServer').value['securityMode'] === SECURITY_CONFIG_MODE.PSK.toString()) {
      this.lwm2mConfigFormGroup.get('bootstrapServer').patchValue({
        clientSecretKey: this.jsonAllConfig.client["key"]
      }, {emitEvent: false});
      this.jsonAllConfig.bootstrap.bootstrapServer.clientSecretKey = this.jsonAllConfig.client["key"];
    }
    if (this.lwm2mConfigFormGroup.get('lwm2mServer').value['securityMode'] === SECURITY_CONFIG_MODE.PSK.toString()) {
      this.lwm2mConfigFormGroup.get('lwm2mServer').patchValue({
        clientSecretKey: this.jsonAllConfig.client["key"]
      }, {emitEvent: false});
      this.jsonAllConfig.bootstrap.lwm2mServer.clientSecretKey = this.jsonAllConfig.client["key"];
    }
    this.upDateJsonAllConfig();
  }

  upDateJsonAllConfig(): void {
    this.data.jsonAllConfig = JSON.parse(JSON.stringify(this.jsonAllConfig));
    this.lwm2mConfigFormGroup.patchValue({
      jsonAllConfig: JSON.parse(JSON.stringify(this.jsonAllConfig))
    }, {emitEvent: false});
    this.lwm2mConfigFormGroup.markAsDirty();
  }

  upDateBootstrapFormGroup(): void {
    this.data.jsonAllConfig = JSON.parse(JSON.stringify(this.jsonAllConfig));
    this.lwm2mConfigFormGroup.patchValue({
      jsonAllConfig: JSON.parse(JSON.stringify(this.jsonAllConfig))
    }, {emitEvent: false});
    this.lwm2mConfigFormGroup.markAsDirty();
  }

  upDateObserveFromGroup(val: any): void {
    let isObserve = [] as Array<string>;
    let observeJson = JSON.parse(JSON.stringify(val['clientLwM2M'])) as [];
    // target = "/3/0/5";
    let pathObj;
    let pathInst;
    let pathIsIns;
    let pathRes;
    let pathIsRes
    observeJson.forEach(obj => {
      Object.entries(obj).forEach(([key, value]) => {
        if (key === 'id') {
          pathObj = value;
        }
        if (key === 'instance') {
          let instanceJson = JSON.parse(JSON.stringify(value)) as [];
          if (instanceJson.length > 0) {
            instanceJson.forEach(obj => {
              Object.entries(obj).forEach(([key, value]) => {
                if (key === 'id') {
                  pathInst = value;
                }
                if (key === 'isObserv' && value) {
                  pathIsIns = '/' + pathObj + '/' + pathInst;
                  isObserve.push(pathIsIns)
                }
                if (key === 'resource') {
                  let resourceJson = JSON.parse(JSON.stringify(value)) as [];
                  if (resourceJson.length > 0) {
                    resourceJson.forEach(obj => {
                      Object.entries(obj).forEach(([key, value]) => {
                        if (key === 'id') {
                          pathRes = value
                        }
                        if (key === 'isObserv' && value) {
                          pathIsRes = '/' + pathObj + '/' + pathInst + '/' + pathRes;
                          isObserve.push(pathIsRes)
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
    this.jsonAllConfig[this.observe] = isObserve;
    this.upDateJsonAllConfig();
  }

  getObservFormGroup(): ObjectLwM2M [] {
    let isObserve = this.jsonAllConfig[this.observe] as Array<string>;
    // "/3/0/1"
    let clientObserve = getDefaultClientObserve() as ObjectLwM2M[];
    let pathObserve: number[] = [];
    let idObj: number;
    let idIns: number;
    let idRes: number;
    isObserve.forEach(observe => {
      pathObserve = Array.from(observe.substring(1).split('/'),Number);
      idObj = pathObserve[0];
      idIns = pathObserve[1];
      idRes = (pathObserve[2]) ? pathObserve[2] : (pathObserve.length===3) ? 0 : null;
      clientObserve.forEach(obj => {
        if (obj.id === idObj) {
          obj.instance.forEach(inst => {
            if (inst.id === idIns) {
              if (idRes === null) inst.isObserv = true;
              else {
                inst.resource.forEach(res => {
                  if (res.id === idRes) res.isObserv = true;
                })
              }
            }
          })
        }
      });
    });
    return clientObserve;
  }

  initLwm2mConfigFormGroup(): FormGroup {
    return this.fb.group({
      jsonAllConfig: [this.jsonAllConfig, []],
      bootstrapServer: [this.jsonAllConfig.bootstrap[this.bootstrapServer], []],
      lwm2mServer: [this.jsonAllConfig.bootstrap[this.lwm2mServer], []],
      observe: [this.getObservFormGroup(), []],
      jsonObserve: [this.jsonAllConfig[this.observe], []],
      bootstrapFormGroup: this.getServerGroup(true),
      lwm2mServerFormGroup: this.getServerGroup(false),
      observeFormGroup: this.fb.group({}),
      endPoint: [this.data.endPoint, []],
      securityConfigClientMode: [SECURITY_CONFIG_MODE[this.jsonAllConfig.client.securityConfigClientMode.toString()], []],
      identityPSK: ['', []],
      clientKey: ['', []],
      clientCertificate: [false, []],
      shortId: [this.jsonAllConfig.bootstrap.servers.shortId, Validators.required],
      lifetime: [this.jsonAllConfig.bootstrap.servers.lifetime, Validators.required],
      defaultMinPeriod: [this.jsonAllConfig.bootstrap.servers.defaultMinPeriod, Validators.required],
      notifIfDisabled: [this.jsonAllConfig.bootstrap.servers.notifIfDisabled, []],
      binding: [this.jsonAllConfig.bootstrap.servers.binding, Validators.required]
    });
  }

  getServerGroup(isBootstrapServer: boolean): FormGroup {
    const port = (isBootstrapServer) ? DEFAULT_PORT_BOOTSTRAP_NO_SEC : DEFAULT_PORT_SERVER_NO_SEC;
    return this.fb.group({
      host: [this.window.location.hostname, [Validators.required]],
      port: [port, [Validators.required]],
      isBootstrapServer: [isBootstrapServer, []],
      securityMode: [this.fb.control(SECURITY_CONFIG_MODE.NO_SEC), []],
      clientPublicKeyOrId: ['', []],
      clientSecretKey: ['', []],
      serverPublicKey: ['', []],
      clientHoldOffTime: [DEFAULT_CLIENT_HOLD_OFF_TIME, [Validators.required]],
      serverId: [DEFAULT_ID_SERVER, [Validators.required]],
      bootstrapServerAccountTimeout: ['', [Validators.required]],
    })
  }

  getFromYml(): void {
    this.bsPublikKeyRPK = BOOTSTRAP_PUBLIC_KEY_RPK;
    this.lwM2mPublikKeyRPK = LWM2M_SERVER_PUBLIC_KEY_RPK;
    this.bsPublikKeyX509 = BOOTSTRAP_PUBLIC_KEY_X509;
    this.lwM2mPublikKeyX509 = LWM2M_SERVER_PUBLIC_KEY_X509;
    //   DEFAULT_PORT_BOOTSTRAP,
    //   DEFAULT_PORT_SERVER,
    //   DEFAULT_PORT_BOOTSTRAP_NO_SEC,
    //   DEFAULT_PORT_SERVER_NO_SEC
  }

  save(): void {
    this.data.endPoint = this.lwm2mConfigFormGroup.get('endPoint').value.split('\"').join('');
    this.dialogRef.close(this.data);
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

}


