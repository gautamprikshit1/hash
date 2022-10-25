import { useLazyQuery } from "@apollo/client";

import { useCallback } from "react";
import {
  GetAllLatestDataTypesQuery,
  GetAllLatestDataTypesQueryVariables,
} from "../../../../graphql/apiTypes.gen";
import { getAllLatestDataTypesQuery } from "../../../../graphql/queries/ontology/data-type.queries";
import { AggregateDataTypesMessageCallback } from "./ontology-types-shim";

export const useBlockProtocolAggregateDataTypes = (): {
  aggregateDataTypes: AggregateDataTypesMessageCallback;
} => {
  const [aggregateFn] = useLazyQuery<
    GetAllLatestDataTypesQuery,
    GetAllLatestDataTypesQueryVariables
  >(getAllLatestDataTypesQuery, {
    fetchPolicy: "no-cache",
  });

  const aggregateDataTypes = useCallback<AggregateDataTypesMessageCallback>(
    async ({ data }) => {
      if (!data) {
        return {
          errors: [
            {
              code: "INVALID_INPUT",
              message: "'data' must be provided for aggregateDataTypes",
            },
          ],
        };
      }

      /**
       * @todo Add filtering to this aggregate query using structural querying.
       *   This may mean having the backend use structural querying and relaying
       *   or doing it from here.
       *   https://app.asana.com/0/1202805690238892/1202890614880643/f
       */
      const response = await aggregateFn({
        variables: {
          dataTypeResolveDepth: 255,
        },
      });

      if (!response.data) {
        return {
          errors: [
            {
              code: "INVALID_INPUT",
              message: "Error calling aggregateDataTypes",
            },
          ],
        };
      }

      return {
        data: response.data.getAllLatestDataTypes,
      };
    },
    [aggregateFn],
  );

  return { aggregateDataTypes };
};