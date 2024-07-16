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

import "../../pair-components/icon_button";

import { MobxLitElement } from "@adobe/lit-mobx";
import { CSSResultGroup, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";

import { core } from "../../core/core";
import { NotebookService } from "../../services/notebook_service";
import { Pages, RouterService } from "../../services/router_service";

import { styles } from "./header.scss";

/** Header component for page panels */
@customElement("header-component")
export class Header extends MobxLitElement {
  static override styles: CSSResultGroup = [styles];
  private readonly routerService = core.getService(RouterService);
  private readonly notebookService = core.getService(NotebookService);

  override render() {
    return html`
      <div class="header">
        <div class="left">
          ${this.renderBackButton()}
          <h1>${this.renderTitle()}</h1>
        </div>
        <div class="right">${this.renderActionButton()}</div>
      </div>
    `;
  }

  private renderActionButton() {
    if (this.routerService.activePage !== Pages.HOME) {
      return nothing;
    }

    const handleClick = () => {
      this.routerService.navigateToHighlightsPage();
    };

    return html`
      <div class="action-button" role="button" @click=${handleClick}>
        <pr-icon icon="featured_seasonal_and_gifts"></pr-icon>
        Highlights
      </div>
    `;
  }

  private renderBackButton() {
    const handleBackButtonClick = this.getHandleBackButtonClick();

    if (!handleBackButtonClick) {
      return nothing;
    }

    return html`
      <pr-icon-button
        icon="arrow_back"
        color="neutral"
        variant="default"
        @click=${handleBackButtonClick}
      >
      </pr-icon-button>
    `;
  }

  private getHandleBackButtonClick(): (() => void) | undefined {
    const activePage = this.routerService.activePage;
    const hasReferencedNotes = this.notebookService.idsToDisplay.length > 0;

    // Don't show back arrows for home, main notes feed
    if (
      activePage === Pages.HOME ||
      (activePage === Pages.NOTES && !hasReferencedNotes)
    ) {
      return undefined;
    }

    // If already navigated in app, route to previous page
    if (this.routerService.hasNavigated) {
      return () => {
        history.back();
      };
    }

    // If first visited page in app, route to these fallback pages
    if (
      activePage === Pages.NOTES &&
      this.notebookService.idsToDisplay.length > 0
    ) {
      return () => {
        this.routerService.navigateToHomePage();
      };
    } else if (activePage === Pages.NOTES_TAG_SELECTED) {
      return () => {
        this.routerService.navigateToNotesPage();
      };
    } else if (activePage === Pages.HISTORY) {
      return () => {
        this.routerService.navigateToSettingsPage();
      };
    } else if (activePage === Pages.PROJECTS) {
      return () => {
        this.routerService.navigateToSettingsPage();
      };
    }

    return undefined;
  }

  private renderTitle() {
    const activePage = this.routerService.activePage;

    if (
      activePage === Pages.NOTES &&
      this.notebookService.idsToDisplay.length > 0
    ) {
      return "Referenced Notes";
    } else if (activePage === Pages.NOTES) {
      return "Notes";
    } else if (activePage === Pages.NOTES_TAG_SELECTED) {
      const params = this.routerService.getActiveRouteParams();
      const id = params["id"] as string | undefined;
      return `#${id ?? ""}`;
    } else if (activePage === Pages.SETTINGS) {
      return "Settings";
    } else if (activePage === Pages.PROJECTS) {
      return "Projects";
    } else if (activePage === Pages.HISTORY) {
      return "History";
    } else if (activePage === Pages.HIGHLIGHTS) {
      return "Highlights";
    } else if (activePage === Pages.HOME) {
      return "Welcome to AutoNotes";
    }
    return "";
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "header-component": Header;
  }
}
