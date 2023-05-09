import { ContextFactory } from "../../src/core/context";
import { FileStorage } from "../../src/core/storage";
import { AccessServiceTest } from "./access-service-test";
import { logger } from "../../src/utils/util.log";

const contextFactory = new ContextFactory(new FileStorage());

const userContext = contextFactory.getContext("user", "test");
const pipelineContext = contextFactory.getContext("pipeline", "test");
export const pluginInitProps = {
  accessService: new AccessServiceTest(),
  pipelineContext: pipelineContext,
  userContext: userContext,
  logger: logger,
};
