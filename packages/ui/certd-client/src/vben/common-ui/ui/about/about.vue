<script setup lang="ts">
import type { AboutProps, DescriptionItem } from "./about";

import { h } from "vue";

import { VBEN_DOC_URL, VBEN_GITHUB_URL, VBEN_PREVIEW_URL } from "/@/vben/constants";

import { VbenRenderContent } from "/@/vben/shadcn-ui";

import { Page } from "../../components";

interface Props extends AboutProps {}

defineOptions({
  name: "AboutUI",
});

withDefaults(defineProps<Props>(), {
  description: "A modern ready-to-use admin application built with Vue 3, Vite, TailwindCSS, and TypeScript.",
  name: "Vben Admin",
  title: "About",
});

declare global {
  const __VBEN_ADMIN_METADATA__: {
    authorEmail: string;
    authorName: string;
    authorUrl: string;
    buildTime: string;
    dependencies: Record<string, string>;
    description: string;
    devDependencies: Record<string, string>;
    homepage: string;
    license: string;
    repositoryUrl: string;
    version: string;
  };
}

const renderLink = (href: string, text: string) => h("a", { href, target: "_blank", class: "vben-link" }, { default: () => text });

const {
  authorEmail,
  authorName,
  authorUrl,
  buildTime,
  dependencies = {},
  devDependencies = {},
  homepage,
  license,
  version,
  // Global variable injected by the Vite metadata plugin
} = __VBEN_ADMIN_METADATA__ || {};

const vbenDescriptionItems: DescriptionItem[] = [
  {
    content: version,
    title: "Version",
  },
  {
    content: license,
    title: "Open source license",
  },
  {
    content: buildTime,
    title: "Last build time",
  },
  {
    content: renderLink(homepage, "View"),
    title: "Homepage",
  },
  {
    content: renderLink(VBEN_DOC_URL, "View"),
    title: "Documentation",
  },
  {
    content: renderLink(VBEN_PREVIEW_URL, "View"),
    title: "Preview",
  },
  {
    content: renderLink(VBEN_GITHUB_URL, "View"),
    title: "Github",
  },
  {
    content: h("div", [renderLink(authorUrl, `${authorName}  `), renderLink(`mailto:${authorEmail}`, authorEmail)]),
    title: "Author",
  },
];

const dependenciesItems = Object.keys(dependencies).map(key => ({
  content: dependencies[key],
  title: key,
}));

const devDependenciesItems = Object.keys(devDependencies).map(key => ({
  content: devDependencies[key],
  title: key,
}));
</script>

<template>
  <Page :title="title">
    <template #description>
      <p class="text-foreground mt-3 text-sm leading-6">
        <a :href="VBEN_GITHUB_URL" class="vben-link" target="_blank">
          {{ name }}
        </a>
        {{ description }}
      </p>
    </template>
    <div class="card-box p-5">
      <div>
        <h5 class="text-foreground text-lg">Basic Information</h5>
      </div>
      <div class="mt-4">
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <template v-for="item in vbenDescriptionItems" :key="item.title">
            <div class="border-border border-t px-4 py-6 sm:col-span-1 sm:px-0">
              <dt class="text-foreground text-sm font-medium leading-6">
                {{ item.title }}
              </dt>
              <dd class="text-foreground mt-1 text-sm leading-6 sm:mt-2">
                <VbenRenderContent :content="item.content" />
              </dd>
            </div>
          </template>
        </dl>
      </div>
    </div>

    <div class="card-box mt-6 p-5">
      <div>
        <h5 class="text-foreground text-lg">Production Dependencies</h5>
      </div>
      <div class="mt-4">
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <template v-for="item in dependenciesItems" :key="item.title">
            <div class="border-border border-t px-4 py-3 sm:col-span-1 sm:px-0">
              <dt class="text-foreground text-sm">
                {{ item.title }}
              </dt>
              <dd class="text-foreground/80 mt-1 text-sm sm:mt-2">
                <VbenRenderContent :content="item.content" />
              </dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
    <div class="card-box mt-6 p-5">
      <div>
        <h5 class="text-foreground text-lg">Development Dependencies</h5>
      </div>
      <div class="mt-4">
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <template v-for="item in devDependenciesItems" :key="item.title">
            <div class="border-border border-t px-4 py-3 sm:col-span-1 sm:px-0">
              <dt class="text-foreground text-sm">
                {{ item.title }}
              </dt>
              <dd class="text-foreground/80 mt-1 text-sm sm:mt-2">
                <VbenRenderContent :content="item.content" />
              </dd>
            </div>
          </template>
        </dl>
      </div>
    </div>
  </Page>
</template>
