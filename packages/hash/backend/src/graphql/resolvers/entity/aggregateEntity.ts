import {
  QueryAggregateEntityArgs,
  Resolver,
  AggregateOperation,
  Visibility,
} from "../../autoGeneratedTypes";
import { DbUnknownEntity } from "../../../types/dbTypes";
import { GraphQLContext } from "../../context";

export const aggregateEntity: Resolver<
  Promise<{
    results: DbUnknownEntity[];
    operation: AggregateOperation;
  }>,
  {},
  GraphQLContext,
  QueryAggregateEntityArgs
> = async (_, { accountId, operation, type }, { dataSources }) => {
  const page = operation?.page || 1;
  const perPage = operation?.perPage || 10;
  const sort = operation?.sort?.field || "updatedAt";

  const startIndex = (page ?? 1) - 1;
  const endIndex = startIndex + (perPage ?? 10);

  // TODO: this returns an array of all entities of the given type in the account.
  // We should perform the sorting & filtering in the database for better performance.
  // For pagination, using a database cursor may be an option.
  const entities = await dataSources.db.getEntitiesByType({
    accountId,
    type,
  });

  const dbEntities = entities
    .filter((entity) => entity.type === type)
    .slice(startIndex, endIndex)
    .sort(
      (a, b) =>
        (a as any)[sort || "updatedAt"] - (b as any)[sort || "updatedAt"]
    )
    .map((entity) => ({
      ...entity,
      id: entity.entityId,
      accountId: entity.accountId,
      visibility: Visibility.Public,
    })) as DbUnknownEntity[];

  return {
    results: dbEntities,
    operation: {
      page,
      perPage,
      sort,
    },
  };
};
