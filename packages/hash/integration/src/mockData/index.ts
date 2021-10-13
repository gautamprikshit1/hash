import "./loadEnv";
import { PostgresAdapter } from "@hashintel/hash-backend/src/db";
import {
  Org,
  Entity,
  EntityType,
  CreateEntityWithEntityTypeIdArgs,
  CreateEntityWithEntityTypeVersionIdArgs,
  CreateEntityWithSystemTypeArgs,
} from "@hashintel/hash-backend/src/model";
import { createOrgs, createUsers } from "./accounts";
import { SystemTypeName } from "../graphql/apiTypes.gen";

export {};

// TODO: import this from the backend
// enum Visibility {
//   Private = "PRIVATE",
//   Public = "PUBLIC",
// }

void (async () => {
  const db = new PostgresAdapter({
    host: process.env.HASH_PG_HOST || "localhost",
    user: process.env.HASH_PG_USER || "postgres",
    password: process.env.HASH_PG_PASSWORD || "postgres",
    database: process.env.HASH_PG_DATABASE || "postgres",
    port: parseInt(process.env.HASH_PG_PORT || "5432", 10),
  });

  // Get the hash org - it's already been created as part of db migration
  const hashOrg = await Org.getOrgByShortname(db)({ shortname: "hash" });

  if (!hashOrg) {
    throw new Error(`
      No org with shortname 'hash' found.
      Has the db migration been run?
      Has the system account name been changed?
    `);
  }

  const [users, _orgs] = await Promise.all([
    createUsers(db)(hashOrg),
    createOrgs(db),
  ]);

  const results = new Map<string, Entity>();

  const requiredTypes = [
    "Company",
    "Divider",
    "Embed",
    "Image",
    "Location",
    "Person",
    "Table",
    "Code",
    "Video",
    "Header",
  ] as const;
  // create the types we'll need below so we can assign their ids to entities
  const newTypeIds: Record<typeof requiredTypes[number], string> = {} as any;

  await Promise.all(
    requiredTypes.map(async (name) => {
      const entityType = await EntityType.create(db)({
        accountId: hashOrg.accountId,
        createdById: hashOrg.entityId, // TODO
        name,
        schema: {},
      });

      newTypeIds[name] = entityType.entityId;
    })
  );

  type CreateEntityMapValue =
    | (Omit<CreateEntityWithEntityTypeIdArgs, "versioned"> & {
        versioned?: boolean;
      })
    | (Omit<CreateEntityWithEntityTypeVersionIdArgs, "versioned"> & {
        versioned?: boolean;
      })
    | (Omit<CreateEntityWithSystemTypeArgs, "versioned"> & {
        versioned?: boolean;
      });

  /** Create all entities specified in the `items` map and add the mutation's response
   * to the `results` map.
   */
  const createEntities = async (items: Map<string, CreateEntityMapValue>) => {
    const names = Array.from(items.keys());
    const mutations = await Promise.all(
      Array.from(items.values()).map((val) =>
        Entity.create(db)({
          ...val,
          versioned: val.versioned ?? true,
        })
      )
    );
    mutations.forEach((res, i) => {
      const name = names[i];
      results.set(name, res);
    });
  };

  const user = users.find(
    ({ properties }) => properties.shortname === "ciaran"
  );
  if (!user) {
    throw new Error("user not found");
  }

  await createEntities(
    new Map<string, CreateEntityMapValue>([
      [
        "text1",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            texts: [{ text: "About me", bold: true }],
          },
        },
      ],
      [
        "header1text",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            texts: [{ text: "My colleagues", bold: true }],
          },
        },
      ],
      [
        "divider1",
        {
          entityTypeId: newTypeIds.Divider,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "text2",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            texts: [
              { text: "A paragraph of regular text " },
              { text: "with", bold: true },
              { text: " " },
              { text: "some", italics: true },
              { text: " " },
              { text: "formatting", underline: true },
              { text: " " },
              { text: "included", bold: true, italics: true, underline: true },
              { text: "." },
            ],
          },
        },
      ],
      [
        "text3",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            texts: [{ text: "A paragraph of italic text", italics: true }],
          },
        },
      ],
      [
        "text4",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            texts: [{ text: "A paragraph of underline text", underline: true }],
          },
        },
      ],
      [
        "text5",
        {
          systemTypeName: SystemTypeName.Text,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {
            texts: [{ text: "HASH's Header Text", bold: true }],
          },
        },
      ],
      [
        "embed1",
        {
          accountId: hashOrg.accountId,
          entityTypeId: newTypeIds.Embed,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "embed2",
        {
          entityTypeId: newTypeIds.Embed,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "img1",
        {
          entityTypeId: newTypeIds.Image,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "img2",
        {
          entityTypeId: newTypeIds.Image,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "code1",
        {
          entityTypeId: newTypeIds.Code,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
      [
        "video1",
        {
          entityTypeId: newTypeIds.Video,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {},
        },
      ],
    ])
  );

  await createEntities(
    new Map<string, CreateEntityMapValue>([
      [
        "header1",
        {
          properties: {
            level: 2,
            text: {
              __linkedData: {
                entityTypeId: SystemTypeName.Text,
                entityId: results.get("header1text")!.entityId,
              },
            },
          },
          entityTypeId: newTypeIds.Header,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "place1",
        {
          properties: {
            country: "UK",
            name: "London",
          },
          entityTypeId: newTypeIds.Location,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "place2",
        {
          properties: {
            country: "FR",
            name: "Nantes",
          },
          entityTypeId: newTypeIds.Location,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "c1",
        {
          properties: {
            name: "HASH",
            url: "https://hash.ai",
          },
          entityTypeId: newTypeIds.Company,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
    ])
  );

  // People Entities
  await createEntities(
    new Map<string, CreateEntityMapValue>([
      [
        "p1",
        {
          properties: {
            email: "aj@hash.ai",
            name: "Akash Joshi",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          accountId: user.accountId,
          createdById: user.entityId,
          entityTypeId: newTypeIds.Person,
        },
      ],
      [
        "p2",
        {
          properties: {
            email: "c@hash.ai",
            name: "Ciaran Morinan",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          entityTypeId: newTypeIds.Person,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "p3",
        {
          properties: {
            email: "d@hash.ai",
            name: "David Wilkinson",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          accountId: user.accountId,
          createdById: user.entityId,
          entityTypeId: newTypeIds.Person,
        },
      ],
      [
        "p4",
        {
          properties: {
            email: "ef@hash.ai",
            name: "Eadan Fahey",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          entityTypeId: newTypeIds.Person,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "p5",
        {
          properties: {
            email: "nh@hash.ai",
            name: "Nate Higgins",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          entityTypeId: newTypeIds.Person,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
      [
        "p6",
        {
          properties: {
            email: "mr@hash.ai",
            name: "Marius Runge",
            employer: {
              __linkedData: {
                entityTypeId: newTypeIds.Company,
                entityId: results.get("c1")!.entityId,
              },
            },
          },
          entityTypeId: newTypeIds.Person,
          accountId: user.accountId,
          createdById: user.entityId,
        },
      ],
    ])
  );

  await createEntities(
    new Map([
      [
        "t1",
        {
          entityTypeId: newTypeIds.Table,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            initialState: {
              hiddenColumns: [
                "id",
                "entityId",
                "employer.entityId",
                "employer.id",
                "employer.entityType",
              ],
            },
            data: {
              __linkedData: {
                entityTypeId: newTypeIds.Person,
                aggregate: {
                  itemsPerPage: 5,
                  sorts: [
                    {
                      field: "createdAt",
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    ])
  );

  // Block Entities
  await createEntities(
    new Map<string, CreateEntityMapValue>([
      [
        "b1",
        {
          systemTypeName: SystemTypeName.Block,
          properties: {
            componentId: "https://block.blockprotocol.org/header",
            entityId: results.get("text1")!.entityId,
            accountId: results.get("text1")!.accountId,
          },
          createdById: user.entityId,
          accountId: user.accountId,
        },
      ],
      [
        "b2",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/paragraph",
            entityId: results.get("text2")!.entityId,
            accountId: results.get("text2")!.accountId,
          },
          createdById: user.entityId,
          accountId: user.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b3",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/paragraph",
            entityId: results.get("text3")!.entityId,
            accountId: results.get("text3")!.accountId,
          },
          createdById: user.entityId,
          accountId: user.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b4",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/table",
            entityId: results.get("t1")!.entityId,
            accountId: results.get("t1")!.accountId,
          },
          createdById: user.entityId,
          accountId: user.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b5",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/header",
            entityId: results.get("text5")!.entityId,
            accountId: results.get("text5")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b6",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/paragraph",
            entityId: results.get("text2")!.entityId,
            accountId: results.get("text2")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b7",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/paragraph",
            entityId: results.get("text3")!.entityId,
            accountId: results.get("text3")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b8",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/paragraph",
            entityId: results.get("text4")!.entityId,
            accountId: results.get("text4")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b9",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/person",
            entityId: results.get("p2")!.entityId,
            accountId: results.get("p2")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b10",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/header",
            entityId: results.get("header1")!.entityId,
            accountId: results.get("header1")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b11",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/divider",
            entityId: results.get("divider1")!.entityId,
            accountId: results.get("divider1")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b12",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/embed",
            entityId: results.get("embed1")!.entityId,
            accountId: results.get("embed1")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b13",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/embed",
            entityId: results.get("embed2")!.entityId,
            accountId: results.get("embed2")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b14",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/image",
            entityId: results.get("img1")!.entityId,
            accountId: results.get("img1")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b15",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/image",
            entityId: results.get("img2")!.entityId,
            accountId: results.get("img2")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
      [
        "b16",
        {
          properties: {
            componentId: "https://block.blockprotocol.org/video",
            entityId: results.get("video1")!.entityId,
            accountId: results.get("video1")!.accountId,
          },
          createdById: user.entityId,
          accountId: hashOrg.accountId,
          systemTypeName: SystemTypeName.Block,
        },
      ],
    ])
  );

  // Page Entities
  await createEntities(
    new Map<string, CreateEntityMapValue>([
      [
        "page1",
        {
          systemTypeName: SystemTypeName.Page,
          accountId: user.accountId,
          createdById: user.entityId,
          properties: {
            contents: [
              {
                entityId: results.get("b1")!.entityId,
                accountId: results.get("b1")!.accountId,
              },
              {
                entityId: results.get("b9")!.entityId,
                accountId: results.get("b9")!.accountId,
              },
              {
                entityId: results.get("b11")!.entityId,
                accountId: results.get("b11")!.accountId,
              },
              {
                entityId: results.get("b2")!.entityId,
                accountId: results.get("b2")!.accountId,
              },
              {
                entityId: results.get("b3")!.entityId,
                accountId: results.get("b3")!.accountId,
              },
              {
                entityId: results.get("b10")!.entityId,
                accountId: results.get("b10")!.accountId,
              },
              {
                entityId: results.get("b4")!.entityId,
                accountId: results.get("b4")!.accountId,
              },
              {
                entityId: results.get("b12")!.entityId,
                accountId: results.get("b12")!.accountId,
              },
              {
                entityId: results.get("b14")!.entityId,
                accountId: results.get("b14")!.accountId,
              },
            ],
            title: "My awesome page",
          },
          // visibility: Visibility.Public,
        },
      ],
      [
        "page2",
        {
          systemTypeName: SystemTypeName.Page,
          accountId: hashOrg.accountId,
          createdById: user.entityId,
          properties: {
            contents: [
              {
                entityId: results.get("b5")!.entityId,
                accountId: results.get("b5")!.accountId,
              },
              {
                entityId: results.get("b4")!.entityId,
                accountId: results.get("b4")!.accountId,
              },
              {
                entityId: results.get("b6")!.entityId,
                accountId: results.get("b6")!.accountId,
              },
              {
                entityId: results.get("b7")!.entityId,
                accountId: results.get("b7")!.accountId,
              },
              {
                entityId: results.get("b8")!.entityId,
                accountId: results.get("b8")!.accountId,
              },
              {
                entityId: results.get("b13")!.entityId,
                accountId: results.get("b13")!.accountId,
              },
              {
                entityId: results.get("b15")!.entityId,
                accountId: results.get("b15")!.accountId,
              },
              {
                entityId: results.get("b16")!.entityId,
                accountId: results.get("b16")!.accountId,
              },
            ],
            title: "HASH's 1st page",
          },
          // visibility: Visibility.Public,
        },
      ],
    ])
  );

  console.log("Mock data created");

  await db.close();

  process.exit();
})();
