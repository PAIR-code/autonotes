/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Service } from "./service";
import { Ref } from "lit/directives/ref.js";

export interface LitToast {
  show: (text: string, duration: number) => {};
}

/**
 * Manages showing a toast.
 */
export class ToastService extends Service {
  toastRef: Ref<LitToast> | undefined = undefined;

  setToast(toastElementRef: Ref<LitToast>) {
    this.toastRef = toastElementRef;
  }

  showToast(text: string, duration: number = 400) {
    if (this.toastRef && this.toastRef.value) {
      this.toastRef.value!.show(text, duration);
    }
  }
}
