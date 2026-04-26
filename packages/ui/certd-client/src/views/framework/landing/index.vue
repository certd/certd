<template>
  <div class="landing-page">
    <nav class="landing-nav">
      <div class="nav-container">
        <div class="nav-logo overflow-hidden text-ellipsis whitespace-nowrap">
          <img :src="siteInfo.logo" alt="Certd Logo" class="logo-img" />
          <span class="logo-text ellipsis">{{ siteInfo.title }}</span>
        </div>
        <div class="nav-links text-nowrap">
          <ThemeToggle />
          <template v-if="isLoggedIn">
            <router-link to="/index" class="btn btn-primary">控制台</router-link>
            <!-- <div class="user-avatar" @click="goProfile">
              <div class="avatar-initials">{{ userInitials }}</div>
            </div> -->
          </template>
          <template v-else>
            <router-link :to="{ name: 'login' }" class="btn btn-outline">登录</router-link>
            <router-link v-if="hasRegisterEnabled" :to="{ name: 'register' }" class="btn btn-primary">注册</router-link>
          </template>
        </div>
      </div>
    </nav>

    <section class="hero-section">
      <div class="hero-container">
        <div class="hero-content">
          <h1 class="hero-title flex flex-col md:flex-row">
            <div>让你的网站证书</div>
            <div class="gradient-text mt-2 md:mt-0 md:ml-4">永不过期</div>
          </h1>
          <p class="hero-description">全自动证书管理系统，首创流水线申请部署证书模式，让你告别证书过期的烦恼。</p>
          <div class="hero-actions">
            <router-link :to="{ name: 'login' }" class="btn btn-large btn-primary">立即开始</router-link>
          </div>
          <div class="hero-benefits">
            <div v-for="(benefit, index) in heroBenefits" :key="index" class="benefit-item">
              <span class="benefit-icon">{{ benefit.icon }}</span>
              <span class="benefit-text">{{ benefit.text }}</span>
            </div>
          </div>
        </div>
        <div class="hero-image-wrapper">
          <img src="/static/images/certd-intro.png" alt="Certd Intro" class="hero-image" />
        </div>
      </div>
    </section>

    <section id="features" class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">强大功能特性</h2>
          <p class="section-subtitle">支持所有主流云服务商和部署场景</p>
        </div>
        <div class="features-grid">
          <div v-for="(feature, index) in features" :key="index" class="feature-card" :style="{ animationDelay: `${index * 0.08}s` }">
            <div class="feature-icon">{{ feature.icon }}</div>
            <div class="feature-text">
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="container">
        <!-- <div class="footer-content">
          <div class="footer-left">
            <div class="footer-logo">
              <img src="/static/images/logo/logo.svg" alt="Certd Logo" class="footer-logo-img" />
              <span class="footer-logo-text">Certd</span>
            </div>
            <p class="footer-desc">全自动证书管理系统</p>
          </div>
          <div class="footer-links">
            <a href="https://certd.docmirror.cn/guide/start.md" target="_blank" class="footer-link">快速开始</a>
            <a href="https://certd.docmirror.cn/guide/tutorial.md" target="_blank" class="footer-link">教程演示</a>
            <a href="https://github.com/certd/certd" target="_blank" class="footer-link">GitHub</a>
            <a href="https://gitee.com/certd/certd" target="_blank" class="footer-link">Gitee</a>
          </div>
        </div> -->
        <div class="footer-bottom">
          <div class="copyright">
            <span>
              <span>Copyright</span>
              <span>&copy;</span>
              <span>{{ envRef.COPYRIGHT_YEAR }}</span>
            </span>
            <span v-if="!settingStore.isComm">
              <span class="divider">|</span>
              <span>
                <a :href="envRef.COPYRIGHT_URL" target="_blank">{{ envRef.COPYRIGHT_NAME }}</a>
              </span>
            </span>
            <span v-if="siteInfo.licenseTo">
              <span class="divider">|</span>
              <a :href="siteInfo.licenseToUrl" target="_blank">{{ siteInfo.licenseTo }}</a>
            </span>
            <span v-if="sysPublic.icpNo">
              <span class="divider">|</span>
              <a href="https://beian.miit.gov.cn/" target="_blank">{{ sysPublic.icpNo }}</a>
            </span>
            <span v-if="sysPublic.mpsNo">
              <span class="divider">|</span>
              <a href="http://www.beian.gov.cn/portal/registerSystemInfo" target="_blank">{{ sysPublic.mpsNo }}</a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, Ref } from "vue";
import { env } from "/@/utils/util.env";
import { useSettingStore } from "/@/store/settings";
import { useUserStore } from "/@/store/user";
import { useAccessStore } from "/@/vben/stores";
import { SiteInfo, SysPublicSetting } from "/@/store/settings/api.basic";
import ThemeToggle from "/@/vben/layouts/widgets/theme-toggle/theme-toggle.vue";
import { useRouter } from "vue-router";

const envRef = ref(env);
const settingStore = useSettingStore();
const userStore = useUserStore();
const accessStore = useAccessStore();
const router = useRouter();

const siteInfo: Ref<SiteInfo> = computed(() => {
  return settingStore.siteInfo;
});
const sysPublic: Ref<SysPublicSetting> = computed(() => {
  return settingStore.sysPublic;
});

const isLoggedIn = computed(() => !!accessStore.accessToken);

const userInitials = computed(() => {
  const userInfo = userStore.getUserInfo;
  if (!userInfo) return "U";
  const name = userInfo.nickName || userInfo.username || "U";
  return name.charAt(0).toUpperCase();
});

function goProfile() {
  router.push("/certd/mine/user-profile");
}

const heroBenefits = ref([
  {
    icon: "♻️",
    text: "自动续期",
  },
  {
    icon: "📊",
    text: "集中管理",
  },
  {
    icon: "🔔",
    text: "状态监控",
  },
  {
    icon: "💰",
    text: "节省成本",
  },
  {
    icon: "🛡️",
    text: "安全可靠",
  },
]);

const features = ref([
  {
    icon: "🔐",
    title: "全自动申请证书",
    description: "支持 DNS-01、HTTP-01、CNAME 代理等多种域名验证方式",
  },
  {
    icon: "🚀",
    title: "全自动部署更新",
    description: "支持 110+ 部署插件，覆盖主流云服务商",
  },
  {
    icon: "📄",
    title: "多种证书格式",
    description: "支持 pem、pfx、der、jks、p7b 多种格式",
  },
  {
    icon: "🌐",
    title: "泛域名支持",
    description: "支持免费通配符域名，多域名打到一个证书",
  },
  {
    icon: "🔔",
    title: "多种通知方式",
    description: "邮件、webhook、企微、钉钉、飞书等通知",
  },
  {
    icon: "🔒",
    title: "安全保障",
    description: "授权加密、2FA、密码防爆破，数据本地保存",
  },
  {
    icon: "💾",
    title: "多数据库支持",
    description: "支持 SQLite、PostgreSQL、MySQL 多种数据库",
  },
  {
    icon: "🔌",
    title: "开放 API 接口",
    description: "提供 RESTful API，方便集成到其他系统",
  },
  {
    icon: "📊",
    title: "站点证书监控",
    description: "定时监控证书过期时间，提前预警",
  },
]);

const hasRegisterEnabled = computed(() => {
  const sysPublic = settingStore.sysPublic;
  return sysPublic.registerEnabled && (sysPublic.usernameRegisterEnabled || sysPublic.emailRegisterEnabled || sysPublic.mobileRegisterEnabled || sysPublic.smsLoginEnabled);
});

onMounted(() => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -30px 0px",
  };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  }, observerOptions);

  document.querySelectorAll(".feature-card").forEach(el => {
    observer.observe(el);
  });
});
</script>

<style lang="less" scoped>
.landing-page {
  min-height: 100vh;
  background: linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background-deep)) 100%);
  color: hsl(var(--foreground));
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 20px 0;
  background: hsla(var(--header), 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid hsl(var(--border));
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-img {
  width: 36px;
  height: 36px;
}

.logo-text {
  font-size: 22px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
}

.avatar-initials {
  color: white;
  font-weight: 700;
  font-size: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }
}

.btn-outline {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));

  &:hover {
    border-color: hsl(var(--accent));
    background: hsl(var(--muted));
  }
}

.btn-large {
  padding: 14px 32px;
  font-size: 16px;
  border-radius: 12px;
}

.hero-section {
  display: flex;
  align-items: center;
  padding: 140px 0 60px;
}

.hero-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 44px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 18px;
  color: hsl(var(--foreground));
}

.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 16px;
  color: hsl(var(--muted-foreground));
  margin-bottom: 28px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 14px;
  margin-bottom: 32px;
}

.hero-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: hsl(var(--muted-foreground));
  font-size: 15px;
}

.benefit-icon {
  font-size: 18px;
}

.hero-image-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-image {
  width: 100%;
  height: auto;
  max-width: 550px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 30px;
  font-weight: 800;
  margin-bottom: 10px;
  color: hsl(var(--foreground));
}

.section-subtitle {
  font-size: 16px;
  color: hsl(var(--muted-foreground));
}

.features-section {
  padding: 60px 0 80px;
  background: hsl(var(--card));
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.feature-card {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: hsl(var(--muted));
  border-radius: 16px;
  border: 1px solid hsl(var(--border));
  transition: all 0.25s ease;
  opacity: 0;
  transform: translateY(20px);

  &:hover {
    transform: translateY(-4px);
    background: hsl(var(--card));
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
    border-color: hsl(var(--accent));
  }

  &.visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-icon {
  font-size: 32px;
  flex-shrink: 0;
  margin-top: 2px;
}

.feature-text {
  flex: 1;
}

.feature-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 6px;
  color: hsl(var(--foreground));
}

.feature-description {
  color: hsl(var(--muted-foreground));
  font-size: 14px;
  line-height: 1.6;
}

.landing-footer {
  padding: 60px 0 40px;
  background: hsl(222.2 84% 4.9%);
  color: hsl(215.4 16.3% 64.9%);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 30px;
}

.footer-left {
  .footer-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .footer-logo-img {
    width: 28px;
    height: 28px;
  }

  .footer-logo-text {
    font-size: 18px;
    font-weight: 700;
    color: hsl(210 40% 98%);
  }

  .footer-desc {
    color: hsl(215.4 16.3% 64.9%);
    font-size: 14px;
  }
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-link {
  color: hsl(215.4 16.3% 64.9%);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;

  &:hover {
    color: hsl(210 40% 98%);
  }
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid hsl(0deg 0% 79.49%);
  color: hsl(0deg 0% 70.18%);
  font-size: 14px;
}

.copyright {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  span {
    margin-left: 5px;
    margin-right: 5px;
  }
  a {
    color: hsl(215.4 16.3% 64.9%);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: hsl(210 40% 98%);
    }
  }
  .divider {
    opacity: 0.5;
  }
}

@media (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 50px;
  }

  .hero-image-wrapper {
    order: -1;
  }

  .hero-image {
    max-width: 400px;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-benefits {
    justify-content: center;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 100px 0 60px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-description {
    font-size: 16px;
  }

  .section-title {
    font-size: 28px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .nav-links {
    gap: 12px;
  }

  .btn {
    padding: 8px 18px;
    font-size: 14px;
  }

  .btn-large {
    padding: 12px 24px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .footer-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .footer-links {
    gap: 20px;
    flex-wrap: wrap;
  }
}
</style>
