import common from "./certd/common";
import navigation from "./certd/navigation";
import dashboard from "./certd/dashboard";
import pipeline from "./certd/pipeline";
import history from "./certd/history";
import monitor from "./certd/monitor";
import certdomain from "./certd/cert-domain";
import cname from "./certd/cname";
import access from "./certd/access";
import open from "./certd/open";
import mine from "./certd/mine";
import notification from "./certd/notification";
import addon from "./certd/addon";
import suite from "./certd/suite";
import project from "./certd/project";
import settings from "./certd/sys-settings";
import plugin from "./certd/sys-plugin";
import authority from "./certd/sys-authority";
import cnameSettings from "./certd/sys-cname";
import tutorial from "./certd/tutorial";
import cron from "./certd/cron";
import client from "./certd/client";
import wallet from "./certd/wallet";
import nettest from "./certd/nettest";
import audit from "./certd/audit";
import applyTemplate from "./certd/apply-template";
import dnsPersist from "./certd/dns-persist";

// Note: @ is reserved in locale messages; use {'@'} when needed.
export default {
  common,
  navigation,
  dashboard,
  pipeline,
  history,
  monitor,
  certdomain,
  cname,
  access,
  open,
  mine,
  notification,
  addon,
  suite,
  project,
  sys: {
    settings,
    plugin,
    authority,
    cname: cnameSettings,
  },
  tutorial,
  cron,
  client,
  wallet,
  nettest,
  audit,
  applyTemplate,
  dnsPersist,
};
