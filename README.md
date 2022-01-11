# HASH

HASH is an open-source, data-centric, all-in-one workspace. HASH combines a rich frontend editor with a powerful entity graph that makes it easy to capture and work with structured data. HASH is built atop the open [Block Protocol](https://github.com/blockprotocol/blockprotocol) allowing users to easily add new block types and functionality to their workspaces.

**This app is not yet ready for production use.** For now it is intended to be used as a test-harness for developers building Block Protocol compliant blocks.

## Getting started

To run HASH locally, please follow these steps:

1.  Make sure you have [Node LTS](https://nodejs.org), [Yarn Classic](https://classic.yarnpkg.com) and [Docker](https://docs.docker.com/get-docker/):

    ```sh
    node --version
    ## ≥ 16.13
    
    yarn --version
    ## ≥ 1.22
    
    docker --version
    ## ≥ 20.10
    
    docker-compose --version
    ## ≥ 2.2
    ```

    If you use Docker for macOS or Windows, go to _Preferences_ → _Resources_ and ensure that Docker can use at least 4GB of RAM (8GB is recommended).

1.  [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) this repository and navigate to the project folder in your terminal.

1.  Install dependencies:

    ```sh
    yarn install
    ```

1.  Create an empty file called `.env.local`:

    ```sh
    npx touch .env.local
    ```

    It will be used for storing locally defined environment variables (the ones we don’t want to store in git).

1.  Launch external services (Postgres, Redis and OpenSearch) as Docker containers:

    ```sh
    yarn external-services up --detach
    ```

    You can keep external services running between app restarts.
    To stop the containers, run:

    ```sh
    yarn external-services down
    ```

    Container data is persisted locally inside `var/external-services`.
    You can delete this directory when containers are stopped for a ‘hard reset’.

1.  **On first run**, or if you want to reset app data, run this command in a separate terminal:

    ```sh
    yarn seed-data
    ```

1.  Launch app services:

    ```sh
    yarn dev
    ```

    This will start backend and frontend in a single terminal.

    You can also launch parts of the app in separate terminals, e.g.:

    ```sh
    yarn dev:backend
    yarn dev:frontend
    ```

    See `package.json` → `scripts` for details and more options.

## User authentication

Our login and signup flows rely on emails with links or authentication codes.
By default, the API server uses `DummyEmailTransporter` which simulates email sending for local development and testing.
You will find authentication codes in `var/api/dummy-email-transporter/email-dumps.yml` and in the terminal output.
If you chose to run the backend and frontend separately, it will be in the backend terminal.

To use `AwsSesEmailTransporter` instead, set `export HASH_EMAIL_TRANSPORTER=aws_ses` in your terminal before running the app.
Note that you will need valid AWS credentials for this email transporter to work.

## Integration with the Block Protocol

HASH is built around the open [Block Protocol](https://blockprotocol.org) ([@blockprotocol/blockprotocol](https://github.com/blockprotocol/blockprotocol) on GitHub).
By default, `packages/hash/shared/src/blockPaths.json` points to the `dev` branch’s deployment of the blockprotocol.org CDN at https://blockprotocol-git-dev-hashintel.vercel.app.
This can be changed to either a local instance of blockprotocol.org (see its `/site/README.md` on how to do that) or a webpack-dev-server instance of a block in development `yarn workspace @hashintel/block-<block-under-development> run dev --port 3010`.

## Build blocks

In order to build individual blocks, use `yarn build-block:<blockname>`. Use `yarn build-blocks` to
build all blocks concurrently.

## Create a new block bundle from template

1.  `yarn new:block <name>`
1.  code in `packages/hash/blocks/<name>`

## Testing

### Backend integration tests

Backend integration tests are located in [packages/hash/integration](./packages/hash/integration) folder.

If you run a local instance of the app, please stop it before running the tests to free network ports.

#### Terminal 1

```sh
yarn external-services up --detach
NODE_ENV=test HASH_PG_DATABASE=backend_integration_tests yarn dev:backend
```

#### Terminal 2

```sh
HASH_PG_DATABASE=backend_integration_tests yarn test:backend-integration
```

We plan to use Playwright [API testing](https://playwright.dev/docs/test-api-testing/) feature instead of Jest.
Thus, `yarn test:backend-integration` and `yarn test:playwright` will probably converge.

### Playwright tests

[Playwright](https://playwright.dev) tests are browser-based integration and end-to-end tests.
They apply to the monorepo as a whole, so are located in the top-level [tests](./tests) folder.
To run these tests locally, you will need to have both backend and frontend running.

To ensure that your local changes are unaffected by the tests, it is recommended to use another database instance (`HASH_PG_DATABASE=playwright`).
The database needs to be re-seeded before each test run.

If you run a local instance of the app, please stop it before running the tests to free network ports.

#### Terminal 1

```sh
yarn external-services up --detach
HASH_PG_DATABASE=playwright yarn dev:backend
```

#### Terminal 2

```sh
HASH_PG_DATABASE=playwright yarn seed-data

## option 1: frontend in dev mode
yarn dev:frontend

## option 2: frontend in prod mode
yarn workspace @hashintel/hash-frontend build
yarn workspace @hashintel/hash-frontend start
```

#### Terminal 3

```sh
yarn test:playwright
```

You can add extra arguments to configure how Playwright runs, e.g.:

```sh
yarn test:playwright --headed --workers=1
```

See `yarn test:playwright --help` for more info.

### Unit tests

Unit tests are executed by [Jest](https://jestjs.io) and use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to cover the UI.
They can be launched at any time with this command:

```sh
yarn test:unit
```

Going forward, consider using Playwright if you want to test the UI.
Your tests will be less wired to the implementation details and thus be closer to what real users see and do.

## Code quality

We perform automated linting and formatting checks on pull requests using GitHub Actions. You may
also run these checks using the git hooks provided in [./hooks](./hooks). To install these hooks,
run:

```sh
yarn install-hooks
```

This installs the hooks into your `.git/hooks` directory as symlinks to the corresponding script in
`./hooks`.

## Monorepo

In order to work w/ multiple packages in a single repository, they must adhere to some conventions.
The below `package.json` file outlines the minimum requirements a package has to fulfill:

```javascript
{
  "name": "@hashintel/hash-<name>",
  "version": "major.minor.patch",
  "description": "lorem ipsum",
  "author": "<package-author>",
  "license": "<package-licence>",
  "scripts": {
    // omit type-checking if not applicable
    "fix:eslint": "eslint --ext .ts,.tsx --fix ./src/",
    "lint:eslint": "eslint --ext .ts,.tsx ./src/",
    "lint:tsc": "tsc --noEmit",
    "build": "echo produce artifacts",
    "clean": "echo remove artifacts",
    // required only if this is a shared package
    "postinstall": "yarn build"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "5.6.0",
    "@typescript-eslint/parser": "5.6.0",
    "eslint": "^7.32.0",
    "eslint-config-airbnb": "^18.2.1",
    "eslint-config-prettier": "8.3.0",
    "eslint-plugin-import": "^2.24.2",
    "eslint-plugin-jest": "25.3.0",
    "eslint-plugin-jsx-a11y": "^6.4.1",
    "eslint-plugin-no-restricted-imports": "0.0.0",
    "eslint-plugin-react": "^7.25.1",
    "eslint-plugin-react-hooks": "4.2.0",
    "rimraf": "3.2.0",
    "typescript": "4.5.2"
  }
}
```

The above `devDependencies` are owed to our root eslint-config at `packages/hash/.eslintrc.json`.
That same config requires a `tsconfig.json` next to the `package.json` if `.ts(x)` files are to be
linted.

## Troubleshooting

### eslint `parserOptions.project`

There is a mismatch between VSCode's eslint plugin and the eslint cli tool. Specifically the option
`parserOptions.project` is not interpreted the same way as reported
[here](https://github.com/typescript-eslint/typescript-eslint/issues/251). If VSCode complains about
a file not being "on the project" underlining an import statement, try to add the following to the
plugin's settings:

```json
"eslint.workingDirectories": [
  { "directory": "packages/hash/api", "!cwd": true }
]
```

### ECONNREFUSED: Refused to connect to your block

The backend Docker instance may not be able to reach your locally hosted block. In that case, you can use [Cloudflare Tunnels](https://developers.cloudflare.com/pages/how-to/preview-with-cloudflare-tunnel) to serve your localhost port via a URL, and use that in `blockPaths.json`.

### Services are not launched because ports are reported as busy

Make sure that ports 3000, 3333, 3838, 5001, 5432, 6379 and 9200 are not used by any other processes.
You can test this by running:

```sh
lsof -n -i:PORT_NUMBER
```

> **TODO:** replace `lsof` with `npx ??? A,B,...N` for a better DX.
> Suggestions welcome!
