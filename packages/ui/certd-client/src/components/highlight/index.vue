<template>
  <pre class="fs-highlight hljs" v-html="highlightHTMLRef"></pre>
</template>

<script lang="ts">
// 相关文档
// https://highlightjs.org/usage/
// http://highlightjs.readthedocs.io/en/latest/api.html#configure-options
import highlight from "highlight.js";
import { ref, watch } from "vue";
import { defineComponent, Ref } from "vue";
import "../highlight-styles/github-gist.css";
//@ts-ignore
import htmlFormat from "./libs/htmlFormat.js";
export default defineComponent({
  name: "FsHighlight",
  props: {
    code: {
      type: String,
      required: false,
      default: ""
    },
    formatHtml: {
      type: Boolean,
      required: false,
      default: false
    },
    lang: {
      type: String,
      required: false,
      default: ""
    }
  },
  setup(props: any, ctx: any) {
    const highlightHTMLRef: Ref = ref("");

    watch(
      () => {
        return props.code;
      },
      () => {
        doHighlight();
      },
      {
        immediate: true
      }
    );

    function doHighlight() {
      const code = props.formatHtml ? htmlFormat(props.code) : props.code;
      highlightHTMLRef.value = (highlight as any).highlightAuto(code, [props.lang, "html", "javascript", "json", "css", "scss", "less"]).value;
    }
    return {
      highlightHTMLRef,
      doHighlight
    };
  }
});
</script>

<style lang="less">
.fs-highlight {
  margin: 0px;
  border-radius: 4px;
}
</style>
