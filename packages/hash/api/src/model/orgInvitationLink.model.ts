import { ApolloError } from "apollo-server-errors";
import { DBClient } from "../db";
import { DBLinkedEntity, EntityType } from "../db/adapter";
import {
  AccessToken,
  OrgInvitationLink,
  DBAccessTokenProperties,
  AccessTokenConstructorArgs,
  Org,
  UpdatePropertiesPayload,
} from ".";

export type DBOrgInvitationLinkProperties = {
  useCount: number;
  org: DBLinkedEntity;
} & DBAccessTokenProperties;

type OrgInvitationLinkConstructorArgs = {
  properties: DBOrgInvitationLinkProperties;
} & AccessTokenConstructorArgs;

class __OrgInvitationLink extends AccessToken {
  properties: DBOrgInvitationLinkProperties;
  errorMsgPrefix: string;

  constructor({
    properties,
    ...remainingArgs
  }: OrgInvitationLinkConstructorArgs) {
    super({ ...remainingArgs, properties });
    this.properties = properties;
    this.errorMsgPrefix = `The invitation link with entityId ${this.entityId} associated with org with entityId ${this.properties.org.__linkedData.entityId}`;
  }

  static async getEntityType(client: DBClient): Promise<EntityType> {
    const dbEntityType = await client.getSystemTypeLatestVersion({
      systemTypeName: "OrgInvitationLink",
    });
    return dbEntityType;
  }

  /**
   * Create an org invitation.
   * @param {Org} org - The organisation the invitation is associated with.
   */
  static async createOrgInvitationLink(
    client: DBClient,
    params: {
      org: Org;
      createdByAccountId: string;
    },
  ): Promise<OrgInvitationLink> {
    const { org, createdByAccountId } = params;

    const properties: DBOrgInvitationLinkProperties = {
      useCount: 0,
      accessToken: AccessToken.generateAccessToken(),
      org: org.convertToDBLink(),
    };

    const entity = await client.createEntity({
      accountId: org.accountId,
      createdByAccountId,
      entityTypeId: (await OrgInvitationLink.getEntityType(client)).entityId,
      properties,
      versioned: false,
    });

    const orgInvitationLink = new OrgInvitationLink({
      ...entity,
      properties,
    });

    /**
     * @todo: remove this when we have a way of resolving the inverse
     * relationship of (OrgInvitationLink)-[org]->(Org)
     */

    org.properties.invitationLink = orgInvitationLink.convertToDBLink();

    return orgInvitationLink;
  }

  async updateProperties(
    client: DBClient,
    params: UpdatePropertiesPayload<any>,
  ) {
    await super.updateProperties(client, params);
    this.properties = params.properties;
    return params.properties;
  }

  /**
   * Increments the use count of the invitation.
   */
  use(client: DBClient, updatedByAccountId: string) {
    return this.partialPropertiesUpdate(client, {
      updatedByAccountId,
      properties: {
        useCount: this.properties.useCount + 1,
      },
    } as any);
  }

  validate(errorCodePrefix?: string) {
    if (this.hasBeenRevoked()) {
      const msg = `${this.errorMsgPrefix} has been revoked.`;
      throw new ApolloError(msg, `${errorCodePrefix}REVOKED`);
    }
  }
}

export default __OrgInvitationLink;
