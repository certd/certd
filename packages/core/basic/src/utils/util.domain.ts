//域名是否匹配，支持通配符
function match(targetDomains: string | string[], inDomains: string[]) {
  if (!targetDomains || targetDomains.length == 0) {
    return false;
  }
  if (!inDomains || inDomains.length == 0) {
    return false;
  }

  if (typeof targetDomains === "string") {
    targetDomains = [targetDomains];
  }
  for (let targetDomain of targetDomains) {
    let matched = false;
    if (targetDomain.startsWith(".")) {
      targetDomain = "*" + targetDomain;
    }
    for (let inDomain of inDomains) {
      if (inDomain.startsWith(".")) {
        inDomain = "*" + inDomain;
      }
      if (targetDomain === inDomain) {
        matched = true;
        break;
      }

      if (!inDomain.startsWith("*.")) {
        //不可能匹配
        continue;
      }
      //子域名匹配通配符即可
      const firstDotIndex = targetDomain.indexOf(".");
      const targetDomainSuffix = targetDomain.substring(firstDotIndex + 1);
      if (targetDomainSuffix === inDomain.substring(2)) {
        matched = true;
        break;
      }
    }
    //有一个没有匹配上，就失败
    if (!matched) {
      return false;
    }
    //这个匹配上了，检查下一个
  }
  //没有提前return 全部匹配上了
  return true;
}

function isIpv4(d: string) {
  if (!d) {
    return false;
  }
  const isIPv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return isIPv4Regex.test(d);
}

function isIpv6(d: string) {
  if (!d) {
    return false;
  }
  try {
    // 尝试构造URL，用IPv6作为hostname
    new URL(`http://[${d}]`);
    return true;
  } catch {
    return false;
  }
}

function isIp(d: string) {
  if (!d) {
    return false;
  }
  return isIpv4(d) || isIpv6(d);
}

export const domainUtils = {
  match,
  isIpv4,
  isIpv6,
  isIp,
};
