import * as api from "/@/views/certd/pipeline/api";
import { notification } from "ant-design-vue";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { env } from "/@/utils/util.env";
import { useModal } from "/@/use/use-modal";
import { useProjectStore } from "/@/store/project";
import { useUserStore } from "/@/store/user";

export function useCertViewer() {
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const model = useModal();
  const viewCert = async (id: number) => {
    const cert = await api.GetCert(id);
    if (!cert) {
      notification.error({ message: "请先运行一次流水线" });
      return;
    }

    model.success({
      title: "查看证书",
      maskClosable: true,
      okText: "关闭",
      width: 800,
      content: () => {
        return <CertView cert={cert}></CertView>;
      },
    });
  };

  const downloadCert = async (id: any) => {
    const files = await api.GetFiles(id);
    model.success({
      title: "点击链接下载",
      maskClosable: true,
      okText: "关闭",
      content: () => {
        const children = [];
        for (const file of files) {
          let downloadUrl = `${env.API}/pi/history/download?pipelineId=${id}&fileId=${file.id}`;
          if (projectStore.isEnterprise) {
            downloadUrl += `&projectId=${projectStore.currentProject?.id}`;
          }
          downloadUrl += `&token=${userStore.getToken}`;
          children.push(
            <div>
              <div class={"flex-o m-5"}>
                <fs-icon icon={"ant-design:cloud-download-outlined"} class={"mr-5 fs-16"}></fs-icon>
                <a href={downloadUrl} target={"_blank"}>
                  {file.filename}
                </a>
              </div>
            </div>
          );
        }

        if (children.length === 0) {
          return <div>暂无文件下载</div>;
        }

        return (
          <div class={"mt-3"}>
            <div> {children}</div>
          </div>
        );
      },
    });
  };
  return {
    viewCert,
    downloadCert,
  };
}
