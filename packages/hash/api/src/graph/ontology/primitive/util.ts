import { systemUserShortname } from "@hashintel/hash-shared/environment";
import { entityIdFromOwnedByIdAndEntityUuid } from "@hashintel/hash-subgraph";
import { OwnedById } from "@hashintel/hash-shared/types";
import { ImpureGraphFunction } from "../..";
import { systemUserAccountId } from "../../system-user";
import { getUserById } from "../../knowledge/system-types/user";
import { getOrgById } from "../../knowledge/system-types/org";

/**
 * Get the namespace of an account owner by its id
 *
 * @param params.ownerId - the id of the owner
 */
export const getNamespaceOfAccountOwner: ImpureGraphFunction<
  {
    ownerId: OwnedById;
  },
  Promise<string>
> = async (ctx, params) => {
  const namespace =
    params.ownerId === systemUserAccountId
      ? systemUserShortname
      : (
          (await getUserById(ctx, {
            entityId: entityIdFromOwnedByIdAndEntityUuid(
              systemUserAccountId,
              params.ownerId,
            ),
          }).catch(() => undefined)) ??
          (await getOrgById(ctx, {
            entityId: entityIdFromOwnedByIdAndEntityUuid(
              systemUserAccountId,
              params.ownerId,
            ),
          }).catch(() => undefined))
        )?.shortname;

  if (!namespace) {
    throw new Error(`failed to get namespace for owner: ${params.ownerId}`);
  }

  return namespace;
};