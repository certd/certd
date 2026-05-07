export type CertApplyStepInputPatch = {
  renewDays?: number;
  privateKeyType?: string;
};

export type GetStepInputDefine = (stepType: string) => Record<string, unknown> | undefined;

function isCertApplyStep(step: any) {
  return typeof step?.type === "string" && step.type !== "CertApplyLego" && step.type.startsWith("CertApply");
}

function hasPatchValue(patch: CertApplyStepInputPatch, key: keyof CertApplyStepInputPatch) {
  return Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined;
}

function hasInputDefine(inputDefine: Record<string, unknown> | undefined, key: keyof CertApplyStepInputPatch) {
  return inputDefine == null || Object.prototype.hasOwnProperty.call(inputDefine, key);
}

function applyPatchFields(target: Record<string, unknown>, patch: CertApplyStepInputPatch, inputDefine: Record<string, unknown> | undefined, fields: (keyof CertApplyStepInputPatch)[]) {
  let changed = false;
  for (const field of fields) {
    if (!hasPatchValue(patch, field) || !hasInputDefine(inputDefine, field)) {
      continue;
    }
    target[field] = patch[field];
    changed = true;
  }
  return changed;
}

export function updateCertApplyStepInputs(pipeline: any, patch: CertApplyStepInputPatch, getStepInputDefine?: GetStepInputDefine) {
  const fields: (keyof CertApplyStepInputPatch)[] = ["renewDays", "privateKeyType"];
  let count = 0;
  for (const stage of pipeline?.stages || []) {
    for (const task of stage?.tasks || []) {
      for (const step of task?.steps || []) {
        if (!isCertApplyStep(step)) {
          continue;
        }
        const inputDefine = getStepInputDefine?.(step.type);
        if (step.input == null) {
          step.input = {};
        }
        if (!applyPatchFields(step.input, patch, inputDefine, fields)) {
          continue;
        }
        count++;
      }
    }
  }
  return count;
}
