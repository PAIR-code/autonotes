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

import * as router5 from "router5";
import browserPlugin from "router5-plugin-browser";
import { computed, makeObservable, observable } from "mobx";
import { LlmService } from "./llm_service";
import { NotebookService } from "./notebook_service";
import { NOTES_SCROLL_KEY, ScrollService } from "./scroll_service";
import { Service } from "./service";

interface ServiceProvider {
  notebookService: NotebookService;
  llmService: LlmService;
  scrollService: ScrollService;
}

/**
 * Handles App routing and page navigation
 */
export class RouterService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    this.router = router5.createRouter(this.routes, {
      defaultRoute: Pages.HOME,
      // defaultParams,
      queryParams: { booleanFormat: "empty-true", nullFormat: "hidden" },
      queryParamsMode: "loose",
    });
  }

  protected readonly routes: router5.Route[] = [
    {
      name: Pages.HOME,
      path: "/",
    },
    {
      name: Pages.NOTES,
      path: "/notes",
    },
    {
      name: Pages.NOTES_TAG_SELECTED,
      path: "/notes/:id",
    },
    {
      name: Pages.CHAT,
      path: "/chat",
    },
    {
      name: Pages.HISTORY,
      path: "/history",
    },
    {
      name: Pages.SETTINGS,
      path: "/settings",
    },
    {
      name: Pages.HIGHLIGHTS,
      path: "/highlights",
    },
    {
      name: Pages.PROJECTS,
      path: "/projects",
    },
  ];

  private readonly router: router5.Router;

  @observable.ref activeRoute: Route = { name: "", params: {}, path: "" };
  @observable isHandlingRouteChange = false;
  @observable hasNavigated = false; // True if navigated at least once in app

  private getPage(route: Route): Pages | undefined {
    if (!route) return undefined;
    return route.name as Pages;
  }

  @computed
  get activePage(): Pages | undefined {
    return this.getPage(this.activeRoute);
  }

  override initialize() {
    this.router.usePlugin(browserPlugin({ useHash: true }));
    this.router.subscribe((routeChange: RouteChange) => {
      this.handlerRouteChange(routeChange);
    });
    this.router.start();
  }

  private handlerRouteChange(routeChange: RouteChange) {
    this.activeRoute = routeChange.route;

    if (this.activeRoute.name === Pages.NOTES_TAG_SELECTED) {
      const tag = this.activeRoute.params["id"] as string;
      this.sp.notebookService.selectedTag = tag;
    } else {
      this.sp.notebookService.selectedTag = undefined;
    }

    if (this.activeRoute.name === Pages.NOTES) {
      const noteId = this.activeRoute.params["noteId"];
      if (noteId) {
        this.sp.notebookService.setIdsToDisplay([noteId]);
      }
    }

    if (
      this.activeRoute.name === Pages.NOTES ||
      this.activeRoute.name === Pages.NOTES_TAG_SELECTED
    ) {
      window.setTimeout(() => {
        this.sp.scrollService.scrollElementToBottom(NOTES_SCROLL_KEY);
      }, 300);
    }
  }

  private navigate(page: Pages, params: { [key: string]: string } = {}) {
    this.hasNavigated = true;
    return this.router.navigate(page, { ...params });
  }

  navigateToDefault() {
    this.router.navigateToDefault();
  }

  async navigateToNotesPage(tag = "", noteIds: string[] = []) {
    this.sp.notebookService.setIdsToDisplay(noteIds);

    if (tag === "") {
      this.navigate(Pages.NOTES);
    } else {
      this.navigate(Pages.NOTES_TAG_SELECTED, {
        id: tag,
      });
    }
  }

  navigateToHistoryPage() {
    this.navigate(Pages.HISTORY);
  }

  navigateToChatPage() {
    this.navigate(Pages.CHAT);
  }

  navigateToHomePage() {
    this.navigate(Pages.HOME);
  }

  navigateToProjectsPage() {
    this.navigate(Pages.PROJECTS);
  }

  navigateToHighlightsPage() {
    this.navigate(Pages.HIGHLIGHTS);
  }

  navigateToSettingsPage() {
    this.navigate(Pages.SETTINGS);
  }

  getActiveRoute() {
    if (this.activeRoute) return this.activeRoute;
    return this.router.getState();
  }

  getActiveRouteParams() {
    return this.activeRoute.params;
  }
}

/**
 * Type for onRouteChange callback subscription.
 */
export type Route = router5.State;

/**
 * Type for onRouteChange callback subscription.
 */
export type RouteChange = router5.SubscribeState;

/**
 * Enumeration of different pages.
 */
export enum Pages {
  HOME = "HOME",
  NOTES = "NOTES",
  NOTES_TAG_SELECTED = "NOTES_TAG_SELECTED",
  CHAT = "CHAT",
  HISTORY = "HISTORY",
  PROJECTS = "PROJECTS",
  SETTINGS = "SETTINGS",
  HIGHLIGHTS = "HIGHLIGHTS",
}

/**
 * Metadata for top-level navigation pages.
 */
export interface NavItem {
  page: Pages;
  title: string;
  icon: string;
  showInSidenav: boolean;
  showInTabnav: boolean;
  isPrimaryPage: boolean;
}

/**
 * Top-level navigation items.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    page: Pages.HOME,
    title: "Home",
    icon: "chart_spark",
    showInSidenav: true,
    showInTabnav: true,
    isPrimaryPage: true,
  },
  {
    page: Pages.CHAT,
    title: "Chat",
    icon: "chat_mirror",
    showInSidenav: true,
    showInTabnav: true,
    isPrimaryPage: true,
  },
  {
    page: Pages.NOTES,
    title: "Notes",
    icon: "sticky_note_2",
    showInSidenav: true,
    showInTabnav: true,
    isPrimaryPage: true,
  },
  {
    page: Pages.HIGHLIGHTS,
    title: "Highlights",
    icon: "featured_seasonal_and_gifts",
    showInSidenav: false,
    showInTabnav: true,
    isPrimaryPage: false,
  },
  {
    page: Pages.SETTINGS,
    title: "Settings",
    icon: "settings",
    showInSidenav: true,
    showInTabnav: true,
    isPrimaryPage: false,
  },
];
