import { useMemo } from "react";
import { Org } from "../../lib/org";
import { User } from "../../lib/user";
import { useOrgs } from "./useOrgs";
import { useUsers } from "./useUsers";

export const useWorkspaceByShortname = (
  shortname?: string,
): { workspace?: User | Org; loading: boolean } => {
  /**
   * @todo: getting an org or user by their shortname should not be happening
   * client side. This could be addressed by exposing structural querying
   * to the frontend.
   *
   * @see https://app.asana.com/0/1201095311341924/1202863271046362/f
   */
  const { users, loading: loadingUsers } = useUsers();
  const { orgs, loading: loadingOrgs } = useOrgs();

  const workspace = useMemo(
    () =>
      shortname
        ? [...(users ?? []), ...(orgs ?? [])].find(
            (userOrOrg) => userOrOrg.shortname === shortname,
          )
        : undefined,
    [shortname, users, orgs],
  );

  return { workspace, loading: loadingUsers || loadingOrgs };
};