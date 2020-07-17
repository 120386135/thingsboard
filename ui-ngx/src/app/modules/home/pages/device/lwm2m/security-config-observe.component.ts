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

import {PageComponent} from "@shared/components/page.component";
import {Component, forwardRef, Inject, Input, OnInit, Output} from "@angular/core";
import {ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";
import {AppState} from "@core/core.state";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {
  DeviceCredentialsDialogLwm2mData,
  ObjectLwM2M
} from "@home/pages/device/lwm2m/security-config.models";


@Component({
  selector: 'tb-security-config-observe-lwm2m',
  templateUrl: './security-config-observe.component.html',
  styleUrls: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SecurityConfigObserveComponent),
      multi: true
    }
  ]
})

export class SecurityConfigObserveComponent extends PageComponent implements OnInit, ControlValueAccessor {

  @Input() observeFormGroup: FormGroup;
  @Input() isDirty: boolean;
  observeValue: ObjectLwM2M[];

  constructor(protected store: Store<AppState>,
              @Inject(MAT_DIALOG_DATA) public data: DeviceCredentialsDialogLwm2mData,
              public dialogRef: MatDialogRef<SecurityConfigObserveComponent, object>,
              public fb: FormBuilder) {
    super(store);
  }


  ngOnInit(): void {

    this.observeFormGroup.addControl('name', this.fb.control('', [Validators.required]));
  }

  registerOnChange(fn: any): void {
    console.log("registerOnChange");
  }

  registerOnTouched(fn: any): void {
    console.log("registerOnTouched");
  }

  setDisabledState(isDisabled: boolean): void {
    console.log("setDisabledState");
  }

  writeValue(value: any): void {
    this.observeValue = value;
    if (this.observeValue) {
      this.updateValueFields();
    }
  }

  updateValueFields(): void {
    this.observeFormGroup.patchValue({
      name: this.observeValue[0].name
    }, {emitEvent: true});
    if (this.isDirty) {
      this.observeFormGroup.get('name').markAsDirty();
      this.isDirty = false;
    }
  }

}
