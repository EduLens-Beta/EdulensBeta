"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { educationStages } from "@/features/student/education-stages";
import { studyGroups } from "@/features/student/school-details";
import { readAccountList, type AccountList } from "./account-data";
import styles from "./admin.module.css";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ready"; data: AccountList };

const pageSize = 25;

function stageLabel(value: string | null) {
  return educationStages.find((stage) => stage.value === value)?.label
    ?? "Not selected";
}

function groupLabel(value: string | null) {
  return studyGroups.find((group) => group.value === value)?.label ?? "—";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default function AdminDashboard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/admin/accounts?limit=${pageSize}&offset=${offset}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!active) return;

        if (response.status === 401) {
          setState({ status: "signed-out" });
          return;
        }
        if (response.status === 403) {
          setState({ status: "forbidden" });
          return;
        }
        if (!response.ok) throw new Error("Account list unavailable.");

        const data = readAccountList(await response.json());
        if (!data || data.offset !== offset || data.limit !== pageSize) {
          throw new Error("Invalid account list.");
        }

        if (active) setState({ status: "ready", data });
      } catch {
        if (active) setState({ status: "error" });
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [offset, attempt]);

  function changePage(nextOffset: number) {
    setState({ status: "loading" });
    setOffset(nextOffset);
  }

  function refresh() {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>EduLens.</Link>
        <span className={styles.adminLabel}>Administration</span>
        <Link href="/account" className={styles.accountLink}>Your account</Link>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>ACCOUNT OVERVIEW</p>
            <h1>Registered accounts</h1>
            <p className={styles.description}>
              View registrations and students’ selected education details.
            </p>
          </div>
          {state.status === "ready" && (
            <button type="button" className={styles.button} onClick={refresh}>
              Refresh
            </button>
          )}
        </div>

        {state.status === "loading" && (
          <div className={styles.stateBox} role="status">
            Loading account information…
          </div>
        )}

        {state.status === "signed-out" && (
          <section className={styles.stateBox}>
            <h2>Please sign in.</h2>
            <p>Use an administrator account to view this page.</p>
            <Link href="/login" className={styles.primary}>Sign in</Link>
          </section>
        )}

        {state.status === "forbidden" && (
          <section className={styles.stateBox}>
            <h2>Administrator access required.</h2>
            <p>Your current account does not have access to this page.</p>
            <Link href="/student" className={styles.primary}>
              Return to your student space
            </Link>
          </section>
        )}

        {state.status === "error" && (
          <section className={styles.stateBox}>
            <h2>Account information is unavailable.</h2>
            <p role="alert">We couldn’t load the list. Please try again.</p>
            <button type="button" className={styles.primary} onClick={refresh}>
              Try again
            </button>
          </section>
        )}

        {state.status === "ready" && (
          <>
            <div className={styles.summary}>
              <div>
                <p className={styles.summaryLabel}>Total registered accounts</p>
                <p className={styles.total}>{state.data.total.toLocaleString()}</p>
              </div>
              <p className={styles.summaryNote}>
                Includes student and administrator accounts.
                Registration does not indicate current online activity.
              </p>
            </div>

            <section className={styles.tableSection} aria-label="Registered accounts">
              <div className={styles.tableHeading}>
                <h2>Account directory</h2>
                <span>Newest registrations first</span>
              </div>

              {state.data.accounts.length === 0 ? (
                <p className={styles.empty}>No accounts on this page.</p>
              ) : (
                <div className={styles.tableScroll} tabIndex={0}
                  role="region" aria-label="Account details, scroll horizontally">
                  <table className={styles.table}>
                    <caption className={styles.srOnly}>
                      Registered accounts. Signup times are in Bangladesh time.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Account</th>
                        <th scope="col">Education stage</th>
                        <th scope="col">Class / Group</th>
                        <th scope="col">Status</th>
                        <th scope="col">Role</th>
                        <th scope="col">Signed up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.accounts.map((account) => (
                        <tr key={account.id}>
                          <td>
                            <span className={styles.name}>{account.name}</span>
                            <span className={styles.email}>{account.email}</span>
                          </td>
                          <td>{stageLabel(account.education_stage)}</td>
                          <td>
                            {account.school_class
                              ? `Class ${account.school_class}`
                              : "—"}
                            {account.study_group && (
                              <span className={styles.secondary}>
                                {groupLabel(account.study_group)}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={account.is_active
                              ? styles.active : styles.inactive}>
                              {account.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{account.is_admin ? "Administrator" : "Student"}</td>
                          <td className={styles.date}>
                            {formatDate(account.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className={styles.pagination}>
                <p role="status" aria-live="polite">
                  {state.data.accounts.length
                    ? `${state.data.offset + 1}–${state.data.offset + state.data.accounts.length} of ${state.data.total}`
                    : `0 shown · ${state.data.total} total`}
                </p>
                <div>
                  <button type="button" className={styles.button}
                    disabled={offset === 0}
                    onClick={() => changePage(Math.max(0, offset - pageSize))}>
                    Previous
                  </button>
                  <button type="button" className={styles.button}
                    disabled={offset + pageSize >= state.data.total}
                    onClick={() => changePage(offset + pageSize)}>
                    Next
                  </button>
                </div>
              </div>
            </section>

            <p className={styles.footnote}>
              Signup times use Bangladesh time (UTC+6). Account status indicates
              whether sign-in is enabled.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
