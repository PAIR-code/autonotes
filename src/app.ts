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

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import "./components/router_output/router_output";
import "./components/settings/settings";
import "./components/header/header";
import "./components/history/history";
import "./components/sidenav/sidenav";
import "./components/notebook/notebook";
import "./components/project/project";

import { Ref, createRef, ref } from "lit/directives/ref.js";
import "lit-toast/lit-toast.js";

import { ColorTheme, TextSize } from "./shared/types";

import { core } from "./core/core";
import { SettingsService } from "./services/settings_service";

import { styles } from "./app.scss";
import { ToastService } from "./services/toast_service";

/** App main component. */
@customElement("autonotes-app")
export class App extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];

  private readonly settingsService = core.getService(SettingsService);
  private readonly toastService = core.getService(ToastService);

  toastRef: Ref<any> = createRef<any>();

  override connectedCallback() {
    super.connectedCallback();
  }

  override firstUpdated() {
    this.toastService.setToast(this.toastRef);
  }

  override render() {
    const isTheme = (theme: ColorTheme) => {
      return this.settingsService.colorTheme === theme;
    };

    const isSize = (size: TextSize) => {
      return this.settingsService.textSize === size;
    };

    const classes = classMap({
      "app-wrapper": true,
      "palette--sugarplum-light": isTheme(ColorTheme.SUGARPLUM_LIGHT),
      "palette--sugarplum-dark": isTheme(ColorTheme.SUGARPLUM_DARK),
      "palette--winterglow-light": isTheme(ColorTheme.WINTERGLOW_LIGHT),
      "palette--winterglow-dark": isTheme(ColorTheme.WINTERGLOW_DARK),
      "size--small": isSize(TextSize.SMALL),
      "size--medium": isSize(TextSize.MEDIUM),
      "size--large": isSize(TextSize.LARGE),
    });

    return html`
      <div class=${classes}>
        <main>
          <router-output-component></router-output-component>
          <lit-toast ${ref(this.toastRef)}></lit-toast>
        </main>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "autonotes-app": App;
  }
}
