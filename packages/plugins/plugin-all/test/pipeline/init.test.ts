import { ContextFactory, FileStorage, logger } from "@certd/pipeline";
import { AccessServiceTest } from "./access-service-test";

const contextFactory = new ContextFactory(new FileStorage());

const userContext = contextFactory.getContext("user", "test");
const pipelineContext = contextFactory.getContext("pipeline", "test");
export const pluginInitProps = {
  accessService: new AccessServiceTest(),
  pipelineContext: pipelineContext,
  userContext: userContext,
  logger: logger,
};
