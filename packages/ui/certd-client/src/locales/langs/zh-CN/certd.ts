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
import syssettings from "./certd/sys-settings";
import sysplugin from "./certd/sys-plugin";
import sysauthority from "./certd/sys-authority";
import syscname from "./certd/sys-cname";
import tutorial from "./certd/tutorial";
import cron from "./certd/cron";

// Note: @ is reserved in locale messages; use {'@'} when needed.
export default {
  ...common,
  ...navigation,
  ...dashboard,
  ...pipeline,
  ...history,
  ...monitor,
  ...certdomain,
  ...cname,
  ...access,
  ...open,
  ...mine,
  ...notification,
  ...addon,
  ...suite,
  ...project,
  ...syssettings,
  ...sysplugin,
  ...sysauthority,
  ...syscname,
  ...tutorial,
  ...cron,
};
