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

import "../../pair-components/icon";
import "../tag/tag_list";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

import { core } from "../../core/core";
import { NotebookService } from "../../services/notebook_service";
import {
  NAV_ITEMS,
  NavItem,
  Pages,
  RouterService,
} from "../../services/router_service";

import { styles } from "./sidenav.scss";
import { ColorTheme } from "../../shared/types";
import { SettingsService } from "../../services/settings_service";

/** App info view component */
@customElement("sidenav-component")
export class SideNav extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly routerService = core.getService(RouterService);
  private readonly notebookService = core.getService(NotebookService);
  private readonly settingsService = core.getService(SettingsService);

  override firstUpdated() {
    // Hack to re-render after pinned tabs are loaded from indexed db.
    window.setTimeout(() => {
      this.requestUpdate();
    }, 100);
  }

  override render() {
    return html`
      <div
        class="title"
        role="button"
        @click=${() => {
          this.routerService.navigateToHomePage();
        }}
      >
        ${this.renderLogo()} AutoNotes
      </div>
      <div class="top">
        ${NAV_ITEMS.filter(
          (navItem) => navItem.showInSidenav && navItem.isPrimaryPage
        ).map((navItem) => this.renderNavItem(navItem))}
        <div class="label-items-wrapper">
          <tag-list></tag-list>
        </div>
      </div>
      <div class="bottom">
        ${this.renderGitHubLink()}
        ${NAV_ITEMS.filter(
          (navItem) => navItem.showInSidenav && !navItem.isPrimaryPage
        ).map((navItem) => this.renderNavItem(navItem))}
      </div>
    `;
  }

  private renderGitHubLink() {
    return html`
      <a
        class="nav-item"
        href="https://github.com/pair-code/autonotes"
        target="_blank"
      >
        <pr-icon icon="code_blocks"></pr-icon>
        GitHub
      </a>
    `;
  }

  private renderNavItem(navItem: NavItem) {
    const navItemClasses = classMap({
      "nav-item": true,
      selected: this.routerService.activePage === navItem.page,
    });

    const handleNavItemClicked = (e: Event) => {
      if (navItem.page === Pages.HOME) {
        this.routerService.navigateToHomePage();
      } else if (navItem.page === Pages.NOTES) {
        this.routerService.navigateToNotesPage();
      } else if (navItem.page === Pages.CHAT) {
        this.routerService.navigateToChatPage();
      } else if (navItem.page === Pages.SETTINGS) {
        this.routerService.navigateToSettingsPage();
      }
    };

    const notesCountText =
      navItem.page === Pages.NOTES
        ? `(${this.notebookService.notes.length})`
        : nothing;

    return html`
      <div class=${navItemClasses} role="button" @click=${handleNavItemClicked}>
        <pr-icon icon=${navItem.icon}></pr-icon>
        ${navItem.title} ${notesCountText}
      </div>
    `;
  }

  private renderLogo() {
    const { colorTheme } = this.settingsService;
    if (
      colorTheme === ColorTheme.SUGARPLUM_DARK ||
      colorTheme === ColorTheme.SUGARPLUM_LIGHT
    ) {
      return html` <div class="logo">${this.renderPurpleLogo()}</div> `;
    }
    return html` <div class="logo">${this.renderBlueLogo()}</div> `;
  }

  private renderBlueLogo() {
    return html`
      <svg
        width="50"
        height="50"
        viewBox="0 0 452 344"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M223.5 339C251.114 339 279.5 317.114 279.5 289.5C279.5 261.886 258.614 239 231 239C206 239 186 255 186 280C186 289.5 166.5 300.5 156.5 287C147.553 274.922 169.333 248 175 237C223 208.667 297.2 168.9 290 150.5C282.8 132.1 295.333 104.333 303.5 100L251.5 79C251.5 79 238 66 206 66C174 66 109.5 99.5 109.5 186.5C109.5 284 161.092 339 223.5 339Z"
          fill="#5AD5F9"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M289.833 123.831C276.209 126.202 263.403 125.246 253.165 118.362C236.975 107.476 230.351 88.8221 228.052 68.3495C244.329 72.0947 251.5 79 251.5 79L303.5 100C298.891 102.446 292.892 112.355 289.833 123.831Z"
          fill="#34B9DC"
        />
        <path
          d="M318.437 20.5976C336.976 31.1284 352.017 47.9915 363.236 74.181C362.582 74.4472 361.913 74.7377 361.232 75.0462C358.139 76.4482 354.455 78.3893 350.445 80.5569C349.086 81.2915 347.682 82.0562 346.238 82.8429C339.052 86.7565 330.869 91.2135 322.253 95.2228C311.892 100.045 301.244 104.052 291.434 105.616C281.616 107.181 273.248 106.209 266.796 101.855C253.162 92.655 248.798 74.9848 248.196 54.5965C247.9 44.5739 248.521 34.3593 249.142 24.8552C249.177 24.328 249.211 23.8022 249.246 23.2781C249.674 16.763 250.085 10.4998 250.114 5.04562C277.058 5.53396 299.76 9.98884 318.437 20.5976Z"
          fill="#5AD5F9"
          stroke="#00677E"
          stroke-width="10"
        />
        <path
          d="M156.5 188L180.5 210.5L273.777 164.5C252.399 147.341 231.228 123.891 224.5 104C187 113 162.686 134.836 156.5 188Z"
          fill="#34B9DC"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M167 318C165.16 318 163.343 317.896 161.557 317.695C143.998 303.956 129.72 283.769 120.589 257.704C126.02 237.152 144.741 222 167 222C175.469 222 183.425 224.193 190.332 228.042C185.026 231.123 179.878 234.121 175 237C173.754 239.418 171.73 242.606 169.424 246.236C161.242 259.119 149.52 277.577 156.5 287C166.5 300.5 186 289.5 186 280C186 263.593 194.614 251.062 207.602 244.387C194.614 251.062 186 263.593 186 280C186 289.397 190.138 300.111 196.834 307.605C188.642 314.113 178.275 318 167 318Z"
          fill="#34B9DC"
        />
        <path
          d="M209 316C195.5 311.5 186 294.237 186 280C186 255 206 239 231 239C258.614 239 279.5 261.886 279.5 289.5C279.5 317.114 251.114 339 223.5 339C161.092 339 109.5 284 109.5 186.5C109.5 99.5 174 66 206 66C238 66 251.5 79 251.5 79"
          stroke="#00677E"
          stroke-width="10"
          stroke-linecap="round"
        />
        <path
          d="M318.437 20.5976C336.976 31.1284 352.017 47.9915 363.236 74.181C362.582 74.4472 361.913 74.7377 361.232 75.0462C358.139 76.4482 354.455 78.3893 350.445 80.5569C349.086 81.2915 347.682 82.0562 346.238 82.8429C339.052 86.7565 330.869 91.2135 322.253 95.2228C311.892 100.045 301.244 104.052 291.434 105.616C281.616 107.181 273.248 106.209 266.796 101.855C253.162 92.655 248.798 74.9848 248.196 54.5965C247.9 44.5739 248.521 34.3593 249.142 24.8552C249.177 24.328 249.211 23.8022 249.246 23.2781C249.674 16.763 250.085 10.4998 250.114 5.04562C277.058 5.53396 299.76 9.98884 318.437 20.5976Z"
          stroke="#00677E"
          stroke-width="10"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M434.496 104.569C444.062 99.0464 447.339 86.8146 441.817 77.2487L437.817 70.3205C432.294 60.7547 420.062 57.4772 410.496 63L407.032 65L431.032 106.569L434.496 104.569ZM420.64 112.569L396.64 71L386.247 77L410.247 118.569L420.64 112.569ZM399.855 124.569L375.855 83L34.641 280L58.641 321.569L399.855 124.569ZM23.3205 300.392L12 320.785L35.3205 321.177L23.3205 300.392Z"
          fill="#00677E"
        />
        <path
          d="M180.5 210.5L156.5 188C162.686 134.836 187 113 224.5 104C236 138 289.7 182.4 314.5 188C345.5 195 351 166 344 154"
          stroke="#00677E"
          stroke-width="10"
        />
        <path
          d="M247 178.5C259.5 200 277.5 214.5 296.5 216"
          stroke="#00677E"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle cx="155" cy="113" r="6" fill="#00677E" />
        <circle cx="134" cy="153" r="6" fill="#00677E" />
        <circle cx="134" cy="204" r="6" fill="#00677E" />
        <circle cx="232" cy="283" r="17" stroke="#00677E" stroke-width="10" />
        <circle cx="212" cy="133" r="6" fill="#00677E" />
        <circle cx="269" cy="24" r="6" fill="#00677E" />
        <circle
          cx="297"
          cy="58"
          r="18"
          fill="white"
          stroke="#00677E"
          stroke-width="12"
        />
        <circle cx="224" cy="151" r="6" fill="#00677E" />
        <circle cx="297" cy="58" r="6" fill="#00677E" />
      </svg>
    `;
  }

  private renderPurpleLogo() {
    return html`
      <svg
        width="50"
        height="50"
        viewBox="0 0 433 344"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M211.5 339C239.114 339 267.5 317.114 267.5 289.5C267.5 261.886 246.614 239 219 239C194 239 174 255 174 280C174 289.5 154.5 300.5 144.5 287C135.553 274.922 157.333 248 163 237C211 208.667 285.2 168.9 278 150.5C270.8 132.1 283.333 104.333 291.5 100L239.5 79C239.5 79 226 66 194 66C162 66 97.5 99.5 97.5 186.5C97.5 284 149.092 339 211.5 339Z"
          fill="#E0B6FF"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M277.833 123.831C264.209 126.202 251.403 125.246 241.165 118.362C224.975 107.476 218.351 88.8221 216.052 68.3495C232.329 72.0946 239.5 79 239.5 79L291.5 100C286.891 102.446 280.892 112.355 277.833 123.831Z"
          fill="#CE91FF"
        />
        <path
          d="M306.437 20.5976C324.976 31.1284 340.017 47.9915 351.236 74.181C350.582 74.4472 349.913 74.7377 349.232 75.0462C346.139 76.4482 342.455 78.3893 338.445 80.5569C337.086 81.2915 335.682 82.0562 334.238 82.8429C327.052 86.7565 318.869 91.2135 310.253 95.2228C299.892 100.045 289.244 104.052 279.434 105.616C269.616 107.181 261.248 106.209 254.796 101.855C241.162 92.655 236.798 74.9848 236.196 54.5965C235.9 44.5739 236.521 34.3593 237.142 24.8552C237.177 24.328 237.211 23.8022 237.246 23.2781C237.674 16.763 238.085 10.4998 238.114 5.04562C265.058 5.53396 287.76 9.98884 306.437 20.5976Z"
          fill="#E0B6FF"
          stroke="#803CB7"
          stroke-width="10"
        />
        <path
          d="M144.5 188L168.5 210.5L261.777 164.5C240.399 147.341 219.228 123.891 212.5 104C175 113 150.686 134.836 144.5 188Z"
          fill="#CE91FF"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M155 318C153.16 318 151.343 317.896 149.557 317.695C131.998 303.956 117.72 283.769 108.589 257.704C114.02 237.152 132.741 222 155 222C163.469 222 171.425 224.193 178.332 228.042C173.026 231.123 167.878 234.121 163 237C161.754 239.418 159.73 242.606 157.424 246.236C149.242 259.119 137.52 277.577 144.5 287C154.5 300.5 174 289.5 174 280C174 263.593 182.614 251.062 195.602 244.387C182.614 251.062 174 263.593 174 280C174 289.397 178.138 300.111 184.834 307.605C176.642 314.113 166.275 318 155 318Z"
          fill="#CE91FF"
        />
        <path
          d="M197 316C183.5 311.5 174 294.237 174 280C174 255 194 239 219 239C246.614 239 267.5 261.886 267.5 289.5C267.5 317.114 239.114 339 211.5 339C149.092 339 97.5 284 97.5 186.5C97.5 99.5 162 66 194 66C226 66 239.5 79 239.5 79"
          stroke="#803CB7"
          stroke-width="10"
          stroke-linecap="round"
        />
        <path
          d="M306.437 20.5976C324.976 31.1284 340.017 47.9915 351.236 74.181C350.582 74.4472 349.913 74.7377 349.232 75.0462C346.139 76.4482 342.455 78.3893 338.445 80.5569C337.086 81.2915 335.682 82.0562 334.238 82.8429C327.052 86.7565 318.869 91.2135 310.253 95.2228C299.892 100.045 289.244 104.052 279.434 105.616C269.616 107.181 261.248 106.209 254.796 101.855C241.162 92.655 236.798 74.9848 236.196 54.5965C235.9 44.5739 236.521 34.3593 237.142 24.8552C237.177 24.328 237.211 23.8022 237.246 23.2781C237.674 16.763 238.085 10.4998 238.114 5.04562C265.058 5.53396 287.76 9.98884 306.437 20.5976Z"
          stroke="#803CB7"
          stroke-width="10"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M422.496 104.569C432.062 99.0464 435.339 86.8146 429.817 77.2487L425.817 70.3205C420.294 60.7547 408.062 57.4772 398.496 63L395.032 65L419.032 106.569L422.496 104.569ZM408.64 112.569L384.64 71L374.247 77L398.247 118.569L408.64 112.569ZM387.855 124.569L363.855 83L22.641 280L46.641 321.569L387.855 124.569ZM11.3205 300.392L0 320.785L23.3205 321.177L11.3205 300.392Z"
          fill="#803CB7"
        />
        <path
          d="M168.5 210.5L144.5 188C150.686 134.836 175 113 212.5 104C224 138 277.7 182.4 302.5 188C333.5 195 339 166 332 154"
          stroke="#803CB7"
          stroke-width="10"
        />
        <path
          d="M235 178.5C247.5 200 265.5 214.5 284.5 216"
          stroke="#803CB7"
          stroke-width="10"
          stroke-linecap="round"
        />
        <circle cx="143" cy="113" r="6" fill="#803CB7" />
        <circle cx="122" cy="153" r="6" fill="#803CB7" />
        <circle cx="122" cy="204" r="6" fill="#803CB7" />
        <circle cx="220" cy="283" r="17" stroke="#803CB7" stroke-width="10" />
        <circle cx="200" cy="133" r="6" fill="#803CB7" />
        <circle cx="257" cy="24" r="6" fill="#803CB7" />
        <circle
          cx="285"
          cy="58"
          r="18"
          fill="white"
          stroke="#803CB7"
          stroke-width="12"
        />
        <circle cx="212" cy="151" r="6" fill="#803CB7" />
        <circle cx="285" cy="58" r="6" fill="#803CB7" />
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sidenav-component": SideNav;
  }
}
