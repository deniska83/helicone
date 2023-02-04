import {
  LightBulbIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

import { useSupabaseClient } from "@supabase/auth-helpers-react";

import { Database } from "../../../supabase/database.types";

import Subscriptions from "./subscriptions";
import { subscriptionChange } from "../../../lib/subscriptionChange";
import AuthLayout from "../../shared/layout/authLayout";
import { UserSettingsResponse } from "../../../pages/api/user_settings";
import Stripe from "stripe";
import { clsx } from "../../shared/clsx";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export type Tier = "free" | "pro" | "enterprise" | "pro-pending-cancel";

export async function fetchPostJSON(url: string, data?: {}) {
  try {
    // Default options are marked with *
    const response = await fetch(url, {
      method: "POST", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *client
      body: JSON.stringify(data || {}), // body data type must match "Content-Type" header
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw err;
  }
}

interface BillingPageProps {}

const CurrentSubscriptionStatus = ({
  subscription,
  tier,
}: {
  subscription?: Stripe.Subscription;
  tier: Tier;
}) => {
  if (tier === "free") {
    return (
      <div className="mt-2 text-sm text-gray-700">
        You are currently on the free tier. You can upgrade to the pro tier to
        get more requests per month.
      </div>
    );
  } else if (tier === "pro") {
    return (
      <div className="mt-2 text-sm text-gray-700">
        You are currently on the pro tier. You can upgrade to the enterprise
        tier to get more requests per month.
      </div>
    );
  } else if (tier === "pro-pending-cancel") {
    const endingDate = new Date(
      subscription?.current_period_end! * 1000
    ).toLocaleDateString();
    const daysLeft = Math.round(
      (subscription?.current_period_end! * 1000 - Date.now()) /
        1000 /
        60 /
        60 /
        24
    );
    return (
      <div className="mt-2 text-sm text-gray-700">
        You pro account is still active until {endingDate} ({daysLeft} days
        left). You can upgrade to the enterprise tier to get more requests per
        month.
      </div>
    );
  } else if (tier === "enterprise") {
    return (
      <div className="mt-2 text-sm text-gray-700">
        You are currently on the enterprise tier. You can downgrade to the pro
        tier to get less requests per month.
      </div>
    );
  } else {
    return <div></div>;
  }
};

interface PlanProps {
  id: number;
  name: string;
  tier: Tier;
  limit: string;
  features: string[];
  isCurrent: boolean;
}

const BillingPage = (props: BillingPageProps) => {
  const client = useSupabaseClient<Database>();

  const [userSettings, setUserSettings] = useState<UserSettingsResponse | null>(
    null
  );
  const [requestsCount, setRequestsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/user_settings")
      .then((res) => {
        if (res.status === 200) {
          return res.json() as Promise<UserSettingsResponse>;
        } else {
          res
            .text()
            .then((text) => setError("Failed to get request limit" + text));

          return null;
        }
      })
      .then((data) => {
        console.log("LIMIT IS", data);
        setUserSettings(data);
      });

    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0);
    startOfThisMonth.setMinutes(0);
    startOfThisMonth.setSeconds(0);
    startOfThisMonth.setMilliseconds(0);

    client
      .from("request_rbac")
      .select("*", { count: "exact" })
      .gte("created_at", startOfThisMonth.toISOString())
      .then((res) => {
        if (res.error !== null) {
          console.error(res.error);
        } else {
          setRequestsCount(res.count!);
        }
      });
  }, [client]);

  if (userSettings === null) {
    return (
      <AuthLayout>
        <div className="animate-pulse w-full h-40 bg-white p-10 text-gray-500">
          {error === null ? (
            "Fetching your billing information..."
          ) : (
            <div className="text-red-500">{error}</div>
          )}
        </div>
      </AuthLayout>
    );
  }
  const currentTier = userSettings.user_settings.tier as Tier;
  const userLimit = userSettings.user_settings.request_limit;

  const plans: PlanProps[] = [
    {
      id: 1,
      name: "Personal",
      tier: "free",
      limit: "1000 requests",
      features: ["Basic Support", "User Metrics"],
      isCurrent: currentTier === "free",
    },
    {
      id: 2,
      name: "Professional",
      tier: "pro",
      limit: "1,000,000 requests",
      features: [
        "Priority Support",
        "Advanced Insights",
        "Early Access to New Features",
      ],
      isCurrent: currentTier === "pro" || currentTier === "pro-pending-cancel",
    },
    {
      id: 3,
      name: "Enterprise",
      tier: "enterprise",
      limit: "unlimited requests",
      features: [
        "Prompt Discovery",
        "Dedicated Support",
        "Design Consultation",
      ],
      isCurrent: currentTier === "enterprise",
    },
  ];

  const renderPendingPlans = (tier: Tier, name: string) => {
    if (tier === "free") {
      return (
        <button
          disabled
          type="button"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => subscriptionChange(tier, currentTier, router)}
        >
          Select<span className="sr-only">, {name}</span>
        </button>
      );
    } else if (tier === "pro") {
      return (
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => subscriptionChange(tier, currentTier, router)}
        >
          Renew<span className="sr-only">, {name}</span>
        </button>
      );
    } else if (tier === "enterprise") {
      return (
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
          onClick={() => subscriptionChange("enterprise", currentTier, router)}
        >
          Select<span className="sr-only">, {name}</span>
        </button>
      );
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col space-y-12">
        <div className="flex flex-col space-y-4">
          <div className="text-xl font-bold">Usage this month</div>
          <div className="flex flex-col sm:flex-row w-full gap-4 h-full justify-between items-left sm:items-center">
            <div className="flex flex-row w-full bg-gray-300 h-4 rounded-md">
              <div
                className="bg-gradient-to-r from-sky-500 to-purple-500 h-full rounded-md"
                style={{
                  width: `${
                    userLimit === 0
                      ? 0
                      : Math.round((requestsCount / userLimit) * 100 * 1000) /
                        1000
                  }%`,
                }}
              />
            </div>
            <div className="flex flex-row min-w-[200px] text-sm sm:text-md">
              {requestsCount} / {userLimit} requests
            </div>
          </div>
          <div className="border-2 p-4 text-sm rounded-md flex flex-row items-center text-gray-600 border-gray-300 w-fit gap-4">
            <LightBulbIcon className="h-4 w-4 text-gray-600" />
            We continue logging your requests after your limit is reached, you
            will just lose access to the dashboard until you upgrade.
          </div>
        </div>
        <div className="">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h1 className="text-xl font-semibold text-gray-900">Plans</h1>
              <CurrentSubscriptionStatus
                subscription={userSettings.subscription}
                tier={currentTier}
              />
            </div>
          </div>
          <div className="mt-10 ring-1 ring-gray-300 sm:-mx-6 md:mx-0 rounded-lg bg-white">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >
                    Plan
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
                  >
                    Limit
                  </th>
                  <th
                    scope="col"
                    className="hidden px-3 py-3.5 text-left text-sm font-semibold text-gray-900 lg:table-cell"
                  >
                    Features
                  </th>

                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Select</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, planIdx) => (
                  <tr key={plan.id}>
                    <td
                      className={clsx(
                        planIdx === 0 ? "" : "border-t border-transparent",
                        "relative py-4 pl-4 sm:pl-6 pr-3 text-sm"
                      )}
                    >
                      <div className="font-medium text-gray-900">
                        {plan.name}
                        {plan.isCurrent ? (
                          <span className="ml-1 text-sky-600">
                            (Current Plan)
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-col text-gray-500 sm:block lg:hidden">
                        <span>{plan.limit}</span>
                        <div>
                          {plan.features.map((feature, idx) => (
                            <div key={idx}>{feature}</div>
                          ))}
                        </div>
                        {/* <span className="hidden sm:inline">·</span> */}
                      </div>
                      {planIdx !== 0 ? (
                        <div className="absolute right-0 left-6 -top-px h-px bg-gray-200" />
                      ) : null}
                    </td>
                    <td
                      className={clsx(
                        planIdx === 0 ? "" : "border-t border-gray-200",
                        "hidden px-3 py-3.5 text-sm text-gray-500 lg:table-cell"
                      )}
                    >
                      {plan.limit}
                    </td>
                    <td
                      className={clsx(
                        planIdx === 0 ? "" : "border-t border-gray-200",
                        "hidden px-3 py-3.5 text-sm text-gray-500 lg:table-cell"
                      )}
                    >
                      <div className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex flex-row">
                            <WrenchScrewdriverIcon className="h-3 w-3 mt-1 mr-1 text-gray-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td
                      className={clsx(
                        planIdx === 0 ? "" : "border-t border-transparent",
                        "relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-medium"
                      )}
                    >
                      {currentTier === "pro-pending-cancel" ? (
                        renderPendingPlans(plan.tier, plan.name)
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={plan.isCurrent}
                          onClick={() =>
                            subscriptionChange(plan.tier, currentTier, router)
                          }
                        >
                          Select<span className="sr-only">, {plan.name}</span>
                        </button>
                      )}

                      {planIdx !== 0 ? (
                        <div className="absolute right-6 left-0 -top-px h-px bg-gray-200" />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default BillingPage;
