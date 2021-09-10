import { useQuery } from "@apollo/client";
import Link from "next/link";

import { GetAccountsQuery } from "../graphql/apiTypes.gen";
import { getAccounts } from "../graphql/queries/account.queries";

import styles from "./index.module.scss";
import { useUser } from "../components/hooks/useUser";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const { data } = useQuery<GetAccountsQuery>(getAccounts);

  if (user) {
    // Temporarily redirect logged in user to their account page
    void router.push(`/${user.accountId}`);
  }

  return (
    <main className={styles.Main}>
      <header>
        <h1>HASH.dev</h1>
      </header>

      <section>
        <h2>Accounts in this instance</h2>
        <ul>
          {data?.accounts.map((account) => (
            <li key={account.entityId}>
              <Link href={`/account/${account.entityId}`}>
                <a>{account.properties.shortname}</a>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Block playground</h2>
        <p>
          <Link href="/playground">
            <a>Click here to visit the block playground</a>
          </Link>
        </p>
      </section>
    </main>
  );
}
