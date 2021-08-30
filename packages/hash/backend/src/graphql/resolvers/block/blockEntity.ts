import { ApolloError } from "apollo-server-express";

import { Resolver } from "../../apiTypes.gen";
import { DbBlockProperties } from "../../../types/dbTypes";
import { GraphQLContext } from "../../context";
import { UnknownEntity } from "../../apiTypes.gen";
import { dbEntityToGraphQLEntity } from "../../util";

export const blockEntity: Resolver<
  Promise<UnknownEntity>,
  DbBlockProperties,
  GraphQLContext,
  {}
> = async ({ accountId, entityId }, {}, { dataSources }) => {
  const entity = await dataSources.db.getEntity({
    accountId,
    entityVersionId: entityId,
  });
  if (!entity) {
    throw new ApolloError(
      `Entity id ${entityId} not found in account ${accountId}`,
      "NOT_FOUND"
    );
  }

  return dbEntityToGraphQLEntity(entity);
};
