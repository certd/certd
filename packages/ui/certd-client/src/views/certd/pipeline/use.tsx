import { notification } from "ant-design-vue";
import CertView from "/@/views/certd/pipeline/cert-view.vue";
import { env } from "/@/utils/util.env";
import { useModal } from "/@/use/use-modal";
import { useProjectStore } from "/@/store/project";
import { useUserStore } from "/@/store/user";
import * as api from "/@/views/certd/pipeline/api";

export function useCertViewer() {
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const model = useModal();
  const viewCert = async (id: number) => {
    const cert = await api.GetCert(id);
    if (!cert) {
      notification.error({ message: "Please run the pipeline once first" });
      return;
    }

    model.success({
      title: "View Certificate",
      maskClosable: true,
      okText: "Close",
      width: 800,
      content: () => {
        return <CertView cert={cert}></CertView>;
      },
    });
  };

  const downloadCert = async (id: any) => {
    let downloadUrl = `${env.API}/pi/cert/downloadZip?id=${id}`;
    if (projectStore.isEnterprise) {
      downloadUrl += `&projectId=${projectStore.currentProject?.id}`;
    }
    downloadUrl += `&token=${userStore.getToken}`;
    window.open(downloadUrl);
  };
  return {
    viewCert,
    downloadCert,
  };
}
