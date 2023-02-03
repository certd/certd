import { FileStorage } from "@certd/pipeline/src/core/storage";
import { ContextFactory } from "@certd/pipeline/src/core/context";
import { AccessServiceTest } from "@certd/pipeline/test/pipeline/access-service-test";
import { logger } from "@certd/pipeline";
import { request } from "@certd/pipeline/src/utils/util.request";

const contextFactory = new ContextFactory(new FileStorage());

const userContext = contextFactory.getContext("user", "test");
const pipelineContext = contextFactory.getContext("pipeline", "test");
export const pluginInitProps = {
  accessService: new AccessServiceTest(),
  pipelineContext: pipelineContext,
  userContext: userContext,
  logger: logger,
  http: request,
};
