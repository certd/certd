export type CertApplyTemplateParams = Record<string, any>;

export const certApplyTemplateExcludeParamFields = ["domains", "domainsVerifyPlan"] as const;
export const certApplyCustomExcludeParamFields = ["domains"] as const;

const certApplyTemplateExcludeParamFieldSet = new Set<string>(certApplyTemplateExcludeParamFields);
const certApplyCustomExcludeParamFieldSet = new Set<string>(certApplyCustomExcludeParamFields);

export function pickCertApplyTemplateParams(input: CertApplyTemplateParams = {}) {
  return pickCertApplyParams(input, certApplyTemplateExcludeParamFieldSet);
}

export function pickCertApplyCustomParams(input: CertApplyTemplateParams = {}) {
  return pickCertApplyParams(input, certApplyCustomExcludeParamFieldSet);
}

function pickCertApplyParams(input: CertApplyTemplateParams = {}, excludeFieldSet: Set<string>) {
  const params: CertApplyTemplateParams = {};
  for (const key of Object.keys(input)) {
    if (!excludeFieldSet.has(key) && input[key] !== undefined) {
      params[key] = input[key];
    }
  }
  return params;
}
